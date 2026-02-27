const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shopee-secret-key-2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://shopee:Bm220832@cluster0.ziacita.mongodb.net/shopee-pix?retryWrites=true&w=majority&appName=Cluster0';

// MIDDLEWARES
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// CONECTAR AO MONGODB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ CONECTADO AO MONGODB!'))
  .catch(err => console.error('❌ ERRO MongoDB:', err.message));

// SCHEMAS
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const PaymentSchema = new mongoose.Schema({
  valor: { type: Number, required: true },
  pixCode: { type: String, required: true },
  vencimento: { type: Date, required: true },
  qrCodeUrl: { type: String, required: true },
  nomeProduto: { type: String, default: '' },
  nomePagador: { type: String, default: '' },
  cpfPagador: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', PaymentSchema);

let copyEvents = [];

// MIDDLEWARE DE AUTENTICAÇÃO
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

// CRIAR ADMIN PADRÃO
async function createDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Bm220832', 10);
      await User.create({ username: 'admin', password: hashedPassword });
      console.log('✅ ADMIN CRIADO');
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
}

mongoose.connection.once('open', () => {
  createDefaultAdmin();
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'API Shopee Pix funcionando!' });
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos' });
    }
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login realizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.get('/api/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar pagamentos' });
  }
});

// NOVA ROTA: Buscar pagamento individual
app.get('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar pagamento' });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { valor, pixCode, vencimento, qrCodeUrl, nomeProduto, nomePagador, cpfPagador } = req.body;
    const payment = await Payment.create({ 
      valor, pixCode, vencimento, qrCodeUrl,
      nomeProduto: nomeProduto || '',
      nomePagador: nomePagador || '',
      cpfPagador: cpfPagador || ''
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar pagamento' });
  }
});

app.put('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { valor, pixCode, vencimento, qrCodeUrl, nomeProduto, nomePagador, cpfPagador } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      id, 
      { valor, pixCode, vencimento, qrCodeUrl, nomeProduto, nomePagador, cpfPagador }, 
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar pagamento' });
  }
});

app.delete('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });
    res.json({ message: 'Pagamento deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar pagamento' });
  }
});

app.post('/api/copy-event', async (req, res) => {
  try {
    const { paymentId, timestamp } = req.body;
    const event = {
      paymentId,
      timestamp: timestamp || new Date().toISOString(),
      id: Date.now()
    };
    copyEvents.push(event);
    if (copyEvents.length > 100) {
      copyEvents = copyEvents.slice(-100);
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar evento' });
  }
});

app.get('/api/copy-events', authenticateToken, (req, res) => {
  res.json(copyEvents);
});

app.delete('/api/copy-events/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  copyEvents = copyEvents.filter(e => e.id !== parseInt(id));
  res.json({ success: true });
});

app.delete('/api/copy-events', authenticateToken, (req, res) => {
  copyEvents = [];
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pagamento', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// NOVA ROTA: Aceitar ID na URL
app.get('/pagamento/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ message: 'Rota não encontrada' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});