const { useState, useEffect } = React;

const getAPIUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return `${window.location.origin}/api`;
};

const API_URL = getAPIUrl();

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const ShopeePixPayment = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [copied, setCopied] = useState(false);
  const [payments, setPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [progressPercent, setProgressPercent] = useState(100);

  useEffect(() => {
    const path = window.location.pathname;
    const hashPath = window.location.hash;
    
    if (hashPath === '#admin') {
      if (authToken) {
        verifyToken();
      } else {
        setShowLogin(true);
      }
    } else if (path.startsWith('/pagamento/')) {
      const id = path.split('/pagamento/')[1];
      if (id) {
        setPaymentId(id);
        loadSinglePayment(id);
      }
    } else {
      loadPayments();
    }
  }, []);

  useEffect(() => {
    if (!currentPayment) return;
    const updateTimer = () => {
      const result = getTimeRemaining(currentPayment.vencimento);
      setTimeRemaining(result);

      // Calcula porcentagem para a barra de progresso
      const now = new Date();
      const expiry = new Date(currentPayment.vencimento);
      const created = currentPayment.createdAt
        ? new Date(currentPayment.createdAt)
        : new Date(expiry.getTime() - 24 * 60 * 60 * 1000);
      const tempoTotal = expiry - created;
      const tempoRestante = expiry - now;
      const percent = tempoTotal > 0 ? (tempoRestante / tempoTotal) * 100 : 0;
      setProgressPercent(Math.max(0, Math.min(100, percent)));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentPayment]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_URL}/verify-token`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        setIsAdmin(true);
        setShowLogin(false);
      } else {
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setShowLogin(true);
      }
    } catch (error) {
      setShowLogin(true);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setLoginError('');
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        setAuthToken(data.token);
        setIsAdmin(true);
        setShowLogin(false);
        window.location.hash = 'admin';
      } else {
        setLoginError(data.message || 'Usuário ou senha incorretos');
      }
    } catch (error) {
      setLoginError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setIsAdmin(false);
    setLoginData({ username: '', password: '' });
    window.location.hash = '';
  };

  const loadSinglePayment = async (id) => {
    try {
      const response = await fetch(`${API_URL}/payments/${id}`);
      const data = await response.json();
      if (response.ok) {
        setCurrentPayment(data);
      } else {
        setCurrentPayment(null);
      }
    } catch (error) {
      setCurrentPayment(null);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/payments`);
      const data = await response.json();
      if (response.ok) {
        setPayments(data);
        if (data.length > 0 && !currentPayment && !paymentId) {
          setCurrentPayment(data[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  };

  const copyToClipboard = async (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    try {
      await fetch(`${API_URL}/copy-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: currentPayment?._id,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Erro ao registrar cópia:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getTimeRemaining = (vencimento) => {
    const now = Date.now();
    const expiry = new Date(vencimento).getTime();
    const diff = expiry - now;
    if (diff <= 0) return 'Expirado';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')} horas ${String(minutes).padStart(2, '0')} minutos ${String(seconds).padStart(2, '0')} segundos`;
  };

  const formatVencimento = (vencimento) => {
    const date = new Date(vencimento);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).replace('.', '');
  };

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    const numbers = cpf.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Gera número de pedido legível a partir do _id (últimos 8 chars em maiúsculo)
  const formatOrderNumber = (id) => {
    if (!id) return '--------';
    return id.toString().slice(-8).toUpperCase();
  };
 
  // TELA DE LOGIN
  if (showLogin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4 shadow-lg">
              <LockIcon />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Área Administrativa</h1>
            <p className="text-gray-600">Acesso restrito aos administradores</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition"
                placeholder="Digite seu usuário"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition pr-12"
                  placeholder="Digite sua senha"
                  disabled={loading}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  type="button"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-red-600 transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              onClick={() => { setShowLogin(false); window.location.hash = ''; }}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Voltar para Pagamentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminPanel onLogout={handleLogout} authToken={authToken} loadPayments={loadPayments} />;
  }

  // TELA DO CLIENTE
  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER SHOPEE — sem alterações */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 py-2 px-4">
        <div className="max-w-2xl mx-auto px-2 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-0.5">
              <img 
                src="/shopee-logo.png" 
                alt="Shopee Logo" 
                className="h-16 object-contain"
                style={{filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))'}}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          PARTE 1 — BLOCO DE INFORMAÇÕES DO PEDIDO
          Aparece logo abaixo do header, só quando há pagamento.
          Mostra: número do pedido, vendedor e status com ping.
      ======================================================== */}
      {currentPayment && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between">

              {/* Número do pedido */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Nº do Pedido</p>
                  <p className="text-xs font-semibold text-gray-700 font-mono tracking-wide">
                    {formatOrderNumber(currentPayment._id)}
                  </p>
                </div>
              </div>

              {/* Divisor vertical */}
              <div className="w-px h-8 bg-gray-200"></div>

              {/* Vendido por */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Vendido por</p>
                  <p className="text-xs font-semibold text-orange-500">Shopee</p>
                </div>
              </div>

              {/* Divisor vertical */}
              <div className="w-px h-8 bg-gray-200"></div>

              {/* Status com bolinha piscando */}
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0 mt-0.5">
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Status</p>
                  <p className="text-xs font-semibold text-orange-500">Aguardando Pgto.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          FIM PARTE 1
      ======================================================== */}

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-4">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
            {currentPayment ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm text-gray-600">{formatCurrency(currentPayment.valor)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Frete</span>
                  <span className="text-sm text-green-600 font-semibold">Grátis</span>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 text-sm font-bold">Total</span>
                  <span className="text-2xl font-bold text-orange-600">{formatCurrency(currentPayment.valor)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-sm font-medium">Pagamento Total</span>
                <span className="text-2xl font-bold text-orange-600">R$0,00</span>
              </div>
            )}
          </div>
          <div className="p-5">
            {!currentPayment ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Pagamento não encontrado</p>
                <p className="text-gray-400 text-sm mt-1">Verifique o link enviado</p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="text-gray-700 text-sm font-semibold mb-2">Pagar em até</p>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-orange-600 font-bold text-base">{timeRemaining || 'Carregando...'}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Vencimento em {formatVencimento(currentPayment.vencimento)}
                    </p>
                    {/* Barra de progresso — Parte 2 */}
                    <div className="bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-orange-500 rounded-full h-1.5 transition-all duration-1000"
                        style={{width: `${progressPercent}%`}}
                      ></div>
                    </div>
                  </div>
                </div>

                {currentPayment?.nomeProduto && (
                  <div className="mb-4 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Produto</p>
                      <p className="text-sm font-semibold text-gray-800">{currentPayment.nomeProduto}</p>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <img 
                      src="/pix-logo.png" 
                      alt="Pix" 
                      className="w-8 h-8 object-contain" 
                    />
                    <span className="font-semibold text-base">Pix</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-center items-center">
                    <img src={currentPayment.qrCodeUrl} alt="QR Code Pix" className="w-60 h-60 object-contain" />
                  </div>

                  {/* PARTE 6 — Bancos */}
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Pague com seu banco preferido</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                        <span className="w-4 h-4 rounded-full flex-shrink-0 bg-purple-600"></span>
                        <span className="text-xs font-medium text-gray-600">Nubank</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{backgroundColor:'#EC7000'}}></span>
                        <span className="text-xs font-medium text-gray-600">Itaú</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                        <span className="w-4 h-4 rounded-full flex-shrink-0 bg-red-600"></span>
                        <span className="text-xs font-medium text-gray-600">Bradesco</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                        <span className="w-4 h-4 rounded-full flex-shrink-0 bg-yellow-400"></span>
                        <span className="text-xs font-medium text-gray-600">Banco do Brasil</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                        <span className="w-4 h-4 rounded-full flex-shrink-0 bg-blue-700"></span>
                        <span className="text-xs font-medium text-gray-600">Caixa</span>
                      </div>
                    </div>
                  </div>

                  {(currentPayment?.nomePagador || currentPayment?.cpfPagador) && (
                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      {currentPayment?.nomePagador && (
                        <div>
                          <p className="text-xs text-gray-600">Nome do Pagador</p>
                          <p className="text-sm font-medium text-gray-800">{currentPayment.nomePagador}</p>
                        </div>
                      )}
                      {currentPayment?.cpfPagador && (
                        <div>
                          <p className="text-xs text-gray-600">CPF</p>
                          <p className="text-sm font-mono text-gray-800">{formatCPF(currentPayment.cpfPagador)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => copyToClipboard(currentPayment.pixCode)}
                    className="w-full mt-3 bg-white border border-orange-500 text-orange-500 py-2.5 rounded font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition"
                  >
                    {copied ? (<><CheckIcon />Código Copiado!</>) : (<><CopyIcon />Copiar Código Pix</>)}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-gray-800 text-sm mb-3">Por favor, siga as instruções:</p>
                  <div className="space-y-2.5">
                    <div className="flex gap-2 items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">1</div>
                      <p className="text-xs text-gray-700 leading-relaxed">Acesse o app do seu banco ou internet banking de preferência.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">2</div>
                      <p className="text-xs text-gray-700 leading-relaxed">Escolha pagar via Pix.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">3</div>
                      <p className="text-xs text-gray-700 leading-relaxed">Escaneie o QR Code ou copie e cole o código Pix acima.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">4</div>
                      <p className="text-xs text-gray-700 leading-relaxed">Seu pagamento será aprovado em alguns segundos.</p>
                    </div>
                  </div>
                </div>
                <button className="w-full bg-orange-500 text-white py-3 rounded font-bold text-sm hover:bg-orange-600 transition shadow-sm">OK</button>
                {/* PARTE 7 — Rodapé de segurança */}
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs text-gray-400">Ambiente 100% seguro e criptografado</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ADMIN PANEL — sem nenhuma alteração
const AdminPanel = ({ onLogout, authToken, loadPayments }) => {
  const [payments, setPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', valor: '', pixCode: '', vencimento: '', qrCodeImage: '', 
    nomeProduto: '', nomePagador: '', cpfPagador: '' 
  });
  const [copyEvents, setCopyEvents] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  useEffect(() => { fetchPayments(); }, []);
  
  useEffect(() => {
    if (!authToken) return;
    const fetchCopyEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/copy-events`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (response.ok) setCopyEvents(data);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
      }
    };
    fetchCopyEvents();
    const interval = setInterval(fetchCopyEvents, 5000);
    return () => clearInterval(interval);
  }, [authToken]);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/payments`, { 
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok) setPayments(data);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
    }
  };
  
  const markAsRead = async (eventId) => {
    try {
      await fetch(`${API_URL}/copy-events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setCopyEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Erro ao remover evento:', error);
    }
  };
  
  const clearAllNotifications = async () => {
    try {
      await fetch(`${API_URL}/copy-events`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setCopyEvents([]);
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  const copyPaymentLink = (paymentId) => {
    const link = `${window.location.origin}/pagamento/${paymentId}`;
    navigator.clipboard.writeText(link);
    setCopiedLinkId(paymentId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleSubmit = async () => {
    if (!formData.valor || !formData.pixCode || !formData.vencimento) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    const payment = { 
      valor: formData.valor, 
      pixCode: formData.pixCode, 
      vencimento: formData.vencimento, 
      qrCodeUrl: formData.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formData.pixCode)}`, 
      nomeProduto: formData.nomeProduto || '', 
      nomePagador: formData.nomePagador || '', 
      cpfPagador: formData.cpfPagador || '' 
    };
    try {
      const url = formData.id ? `${API_URL}/payments/${formData.id}` : `${API_URL}/payments`;
      const method = formData.id ? 'PUT' : 'POST';
      const response = await fetch(url, { 
        method, 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${authToken}` 
        }, 
        body: JSON.stringify(payment) 
      });
      if (response.ok) {
        await fetchPayments();
        await loadPayments();
        setShowForm(false);
        setFormData({ id: '', valor: '', pixCode: '', vencimento: '', qrCodeImage: '', nomeProduto: '', nomePagador: '', cpfPagador: '' });
      } else {
        alert('Erro ao salvar pagamento');
      }
    } catch (error) {
      alert('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;
    try {
      const response = await fetch(`${API_URL}/payments/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${authToken}` } 
      });
      if (response.ok) {
        await fetchPayments();
        await loadPayments();
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { 
        setFormData({...formData, qrCodeImage: event.target.result}); 
      };
      reader.readAsDataURL(file);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const formatVencimento = (vencimento) => {
    const date = new Date(vencimento);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).replace('.', '');
  };

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    const numbers = cpf.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setFormData({...formData, cpfPagador: value});
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur rounded-lg p-2"><LockIcon /></div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative bg-white/20 backdrop-blur hover:bg-white/30 p-3 rounded-lg transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {copyEvents.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {copyEvents.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border-2 border-orange-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b bg-orange-50">
                    <h3 className="font-bold text-gray-800 text-sm">🔔 Códigos Copiados</h3>
                  </div>
                  {copyEvents.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {copyEvents.slice().reverse().map((event) => {
                        const payment = payments.find(p => p._id === event.paymentId);
                        const timeAgo = new Date(event.timestamp).toLocaleString('pt-BR');
                        return (
                          <div key={event.id} className="p-3 hover:bg-gray-50">
                            <div className="flex justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 text-sm">✓ Código Copiado!</p>
                                {payment && (
                                  <div className="text-xs text-gray-600">
                                    <p className="font-medium text-orange-600">💰 {formatCurrency(payment.valor)}</p>
                                    {payment.nomeProduto && <p>📦 {payment.nomeProduto}</p>}
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 mt-1">🕐 {timeAgo}</p>
                              </div>
                              <button onClick={() => markAsRead(event.id)} className="text-gray-400 hover:text-red-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {copyEvents.length > 0 && (
                    <div className="p-3 border-t bg-gray-50">
                      <button onClick={clearAllNotifications} className="w-full text-xs text-gray-600 hover:text-orange-600 font-semibold">
                        🗑️ Limpar todas
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={onLogout} className="bg-white text-orange-500 px-4 py-2 rounded-lg font-semibold hover:bg-orange-50 transition">
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Gerenciar Pagamentos Pix</h2>
            <button onClick={() => setShowForm(!showForm)} className="bg-orange-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition shadow">
              + Novo Pagamento
            </button>
          </div>
          
          {showForm && (
            <div className="bg-gradient-to-br from-gray-50 to-orange-50 p-6 rounded-xl mb-6 border-2 border-orange-200">
              <h3 className="font-bold text-lg text-gray-800 mb-4">{formData.id ? 'Editar Pagamento' : 'Criar Novo Pagamento'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$) *</label>
                  <input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" placeholder="1000.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vencimento *</label>
                  <input type="datetime-local" value={formData.vencimento} onChange={(e) => setFormData({...formData, vencimento: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Produto</label>
                  <input type="text" value={formData.nomeProduto} onChange={(e) => setFormData({...formData, nomeProduto: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" placeholder="Ex: iPhone 15 Pro Max" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Pagador</label>
                  <input type="text" value={formData.nomePagador} onChange={(e) => setFormData({...formData, nomePagador: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" placeholder="João Silva" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CPF do Pagador</label>
                  <input type="text" value={formatCPF(formData.cpfPagador)} onChange={handleCPFChange} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" placeholder="000.000.000-00" maxLength="14" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código Pix *</label>
                  <textarea value={formData.pixCode} onChange={(e) => setFormData({...formData, pixCode: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none h-28 font-mono text-sm" placeholder="00020126330014br.gov.bcb.pix..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Imagem QR Code (opcional)</label>
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 hover:border-orange-500 transition bg-white">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="qr-upload" />
                    <label htmlFor="qr-upload" className="cursor-pointer flex flex-col items-center gap-3">
                      {formData.qrCodeImage ? (
                        <div className="text-center">
                          <img src={formData.qrCodeImage} alt="QR Code" className="w-40 h-40 mx-auto mb-3 rounded-lg border-4 border-orange-500 shadow-lg" />
                          <p className="text-sm text-green-600 font-bold">✓ Imagem carregada</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-700 font-semibold">Clique para upload do QR Code</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-lg font-bold hover:from-orange-600 hover:to-red-600 transition shadow-lg disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar Pagamento'}
                </button>
                <button onClick={() => { setShowForm(false); setFormData({ id: '', valor: '', pixCode: '', vencimento: '', qrCodeImage: '', nomeProduto: '', nomePagador: '', cpfPagador: '' }); }} className="bg-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-400 transition">
                  Cancelar
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">Nenhum pagamento cadastrado</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment._id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <img src={payment.qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded-lg border-2 border-orange-200" />
                      <div className="flex-1">
                        <p className="font-bold text-xl text-orange-600">{formatCurrency(payment.valor)}</p>
                        {payment.nomeProduto && <p className="text-sm text-gray-700 mt-1 font-medium">📦 {payment.nomeProduto}</p>}
                        <p className="text-sm text-gray-600 mt-1">📅 Vence: {formatVencimento(payment.vencimento)}</p>
                        {(payment.nomePagador || payment.cpfPagador) && (
                          <div className="mt-2 text-xs text-gray-500">
                            {payment.nomePagador && <p>👤 {payment.nomePagador}</p>}
                            {payment.cpfPagador && <p>🆔 {formatCPF(payment.cpfPagador)}</p>}
                          </div>
                        )}
                        
                        <div className="mt-3 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-700 mb-1">🔗 Link Único</p>
                              <p className="text-xs text-gray-600 font-mono break-all">
                                {window.location.origin}/pagamento/{payment._id}
                              </p>
                            </div>
                            <button
                              onClick={() => copyPaymentLink(payment._id)}
                              className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                            >
                              {copiedLinkId === payment._id ? (
                                <>
                                  <CheckIcon />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <LinkIcon />
                                  Copiar
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Envie este link para o cliente!
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setFormData({ id: payment._id, valor: payment.valor, pixCode: payment.pixCode, vencimento: payment.vencimento, qrCodeImage: payment.qrCodeUrl, nomeProduto: payment.nomeProduto || '', nomePagador: payment.nomePagador || '', cpfPagador: payment.cpfPagador || '' }); setShowForm(true); }} className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deletePayment(payment._id)} className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<ShopeePixPayment />, document.getElementById('root'));
