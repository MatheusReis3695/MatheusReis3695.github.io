const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

// --- Constants ---
const futureAssets = [
  "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT", "ADA/USDT", "AVAX/USDT", "SHIB/USDT", "DOT/USDT", "LINK/USDT", "MATIC/USDT", "TRX/USDT", "LTC/USDT", "BCH/USDT", "NEAR/USDT", "UNI/USDT", "ICP/USDT", "APT/USDT", "ETC/USDT", "FIL/USDT", "ATOM/USDT", "XLM/USDT", "HBAR/USDT", "OP/USDT", "ARB/USDT", "VET/USDT", "SUI/USDT", "MKR/USDT", "AAVE/USDT","FTM/USDT", "RUNE/USDT", "INJ/USDT", "TIA/USDT", "SEI/USDT", "GRT/USDT","GALA/USDT", "RNDR/USDT", "FET/USDT", "SAND/USDT"
];
const forexAssets = ["1000PEPE/USDT", "WIF/USDT", "ORDI/USDT", "1000BONK/USDT", "STX/USDT", "IMX/USDT","MINA/USDT", "AXS/USDT", "APE/USDT", "MANA/USDT", "DYDX/USDT", "CRV/USDT","LDO/USDT", "EOS/USDT", "FLOW/USDT", "KSM/USDT", "ZEC/USDT", "XTZ/USDT","IOTA/USDT", "WAVES/USDT", "THETA/USDT", "CHZ/USDT", "ENJ/USDT", "COMP/USDT"];

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com';

// --- Services (Crypto & Binance) ---
function hmac_sha256(key, data) {
    const shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.setHMACKey(key, "TEXT");
    shaObj.update(data);
    return shaObj.getHMAC("HEX");
}
const XOR_SECRET_KEY = 'default-secret-key-for-prototyping';
function xorEncrypt(text, key) { let result = ''; for (let i = 0; i < text.length; i++) { result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)); } return result; }
function encrypt(text) { const encrypted = xorEncrypt(text, XOR_SECRET_KEY); return btoa(encrypted); }
function decrypt(encryptedText) { try { const decoded = atob(encryptedText); return xorEncrypt(decoded, XOR_SECRET_KEY); } catch (e) { console.error("Decryption failed:", e); return ""; } }

async function getOpenPositionsStatic(apiKey, secretKey) {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = hmac_sha256(secretKey, queryString);
    const url = `${BINANCE_FUTURES_API_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
    try {
        const response = await fetch(url, { method: 'GET', headers: { 'X-MBX-APIKEY': apiKey, 'Content-Type': 'application/json' } });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`Binance API Error: ${errorData.msg} (Code: ${errorData.code})`); }
        const data = await response.json();
        return data.filter(p => parseFloat(p.positionAmt) !== 0);
    } catch (error) { console.error("Error fetching Binance positions:", error); throw error; }
}

// --- UI Components ---
function Icon({ name, className }) {
    useEffect(() => { lucide.createIcons(); }, []);
    return React.createElement('i', { 'data-lucide': name, className });
}

function InstallPwaButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        // Check if the app is running in standalone mode (already installed)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsAppInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            setDeferredPrompt(null);
        });
    };

    if (isAppInstalled || !deferredPrompt) {
        return null;
    }

    return React.createElement('button', {
        onClick: handleInstallClick,
        className: 'button primary w-full flex items-center justify-center'
    }, React.createElement(Icon, { name: 'download-cloud', className: 'mr-2' }), 'Install App');
}


function PositionCard({ position }) {
    const isLong = parseFloat(position.positionAmt) > 0;
    const pnl = parseFloat(position.unRealizedProfit);
    const isProfitable = pnl > 0;
    const assetName = position.symbol.replace('USDT', '/USDT');

    return React.createElement('div', { className: `card border-2 ${isLong ? 'border-green-500/30' : 'border-red-500/30'}` },
        React.createElement('div', { className: 'card-header' },
            React.createElement('div', { className: 'flex justify-between items-start' },
                React.createElement('div', null,
                    React.createElement('h3', { className: 'card-title flex items-center gap-2' },
                        isLong ? React.createElement(Icon, { name: 'trending-up', className: 'text-green-500' }) : React.createElement(Icon, { name: 'trending-down', className: 'text-red-500' }),
                        assetName
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2 flex-wrap mt-1' },
                        React.createElement('span', { className: `badge outline ${isLong ? 'text-green-500' : 'text-red-500'}` }, isLong ? 'LONG' : 'SHORT'),
                        React.createElement('span', { className: 'badge secondary' }, `${position.leverage}x`)
                    )
                )
            )
        ),
        React.createElement('div', { className: 'card-content space-y-3 text-sm' },
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Unrealized PNL'), React.createElement('span', { className: `font-semibold ${isProfitable ? 'text-green-500' : 'text-red-500'}` }, `${pnl.toFixed(2)} USDT`)),
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Size'), React.createElement('span', { className: 'font-semibold' }, position.positionAmt)),
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Entry Price'), React.createElement('span', { className: 'font-semibold' }, parseFloat(position.entryPrice).toFixed(4))),
            React.createElement('div', { className: 'flex justify-between' }, React.createElement('span', { className: 'text-muted-foreground' }, 'Mark Price'), React.createElement('span', { className: 'font-semibold' }, parseFloat(position.markPrice).toFixed(4)))
        )
    );
}

function PositionsTab({ profile }) {
    const [positions, setPositions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPositions = useCallback(async () => {
        if (!profile) return;
        const storedKeys = localStorage.getItem(`binance_api_${profile}`);
        if (!storedKeys) { setError('Binance API keys not found. Please connect your account.'); setIsLoading(false); return; }
        try {
            const { encryptedApiKey, encryptedSecretKey } = JSON.parse(storedKeys);
            const apiKey = decrypt(encryptedApiKey);
            const secretKey = decrypt(encryptedSecretKey);
            if (!apiKey || !secretKey) { throw new Error("Failed to decrypt keys."); }
            setIsLoading(true); setError(null);
            const openPositions = await getOpenPositionsStatic(apiKey, secretKey);
            setPositions(openPositions);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    }, [profile]);

    useEffect(() => { fetchPositions(); const interval = setInterval(fetchPositions, 30000); return () => clearInterval(interval); }, [fetchPositions]);

    return React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
            React.createElement('h2', { className: 'card-title' }, 'Live Binance Positions'),
            React.createElement('p', { className: 'card-description' }, 'Your current open positions on Binance Futures.')
        ),
        React.createElement('div', { className: 'card-content' },
            error && React.createElement('div', { className: 'alert destructive' }, `Error: ${error}`),
            isLoading && React.createElement('p', null, 'Loading positions...'),
            !isLoading && !error && positions.length === 0 && React.createElement('p', null, 'No open positions found.'),
            !isLoading && !error && positions.length > 0 && React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
                positions.map(pos => React.createElement(PositionCard, { key: pos.symbol, position: pos }))
            )
        )
    );
}

function BinanceConnectDialog({ profileName, isOpen, setIsOpen, onConnect }) {
    const [apiKey, setApiKey] = useState("");
    const [secretKey, setSecretKey] = useState("");

    const handleConnect = () => {
        if (!apiKey || !secretKey) { alert("Please provide both API Key and Secret Key."); return; }
        const encryptedApiKey = encrypt(apiKey);
        const encryptedSecretKey = encrypt(secretKey);
        localStorage.setItem(`binance_api_${profileName}`, JSON.stringify({ encryptedApiKey, encryptedSecretKey }));
        alert("Connection Successful. Keys saved in local storage.");
        setIsOpen(false);
        onConnect();
    };

    if (!isOpen) return null;
    return React.createElement('div', { className: 'dialog-overlay' },
        React.createElement('div', { className: 'dialog-content' },
            React.createElement('div', { className: 'dialog-header' }, React.createElement('h2', { className: 'dialog-title' }, 'Connect to Binance'), React.createElement('p', { className: 'dialog-description' }, 'Enter your API keys for read-only access.')),
            React.createElement('div', { className: 'py-4 space-y-4' },
                React.createElement('div', { className: 'alert destructive' }, React.createElement(Icon, { name: 'alert-triangle', className: 'h-4 w-4' }), React.createElement('h3', { className: 'font-bold' }, 'Security Warning'), React.createElement('p', null, 'Only use API keys with "Read-only" permissions. Keys are stored in your browser\'s local storage.')),
                React.createElement('div', { className: 'space-y-2' }, React.createElement('label', { htmlFor: 'api-key', className: 'label' }, 'API Key'), React.createElement('input', { id: 'api-key', value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: 'Enter your Binance API Key', className: 'input' })),
                React.createElement('div', { className: 'space-y-2' }, React.createElement('label', { htmlFor: 'secret-key', className: 'label' }, 'Secret Key'), React.createElement('input', { id: 'secret-key', type: 'password', value: secretKey, onChange: (e) => setSecretKey(e.target.value), placeholder: 'Enter your Binance Secret Key', className: 'input' }))
            ),
            React.createElement('div', { className: 'dialog-footer' },
                React.createElement('button', { onClick: () => setIsOpen(false), className: 'button outline' }, 'Cancel'),
                React.createElement('button', { onClick: handleConnect, className: 'button primary' }, 'Connect')
            )
        )
    );
}

function DashboardPage() {
    const [profile, setProfile] = useState(null);
    const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);

    useEffect(() => {
        // Request notification permission on component mount
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                }
            });
        }
    }, []);

    useEffect(() => {
        const activeProfile = localStorage.getItem('scalp_pro_active_profile');
        if (activeProfile) {
            setProfile(activeProfile);
        } else {
            const newProfile = prompt("Enter a name for your new profile:");
            if (newProfile) {
                localStorage.setItem('scalp_pro_active_profile', newProfile);
                setProfile(newProfile);
            }
        }
    }, []);
    
    const handleConnect = () => {
        setIsBinanceModalOpen(false);
        // Force a refresh to use the new keys
        window.location.reload();
    };

    const handleLogout = () => {
        localStorage.removeItem('scalp_pro_active_profile');
        setProfile(null);
        window.location.reload();
    };

    if (!profile) {
        return React.createElement('div', { className: 'flex items-center justify-center min-h-screen bg-background text-foreground' }, 
            React.createElement('div', { className: 'w-full max-w-md mx-4 space-y-6' }, 
                React.createElement('div', { className: 'text-center' },
                    React.createElement('h1', { className: 'text-3xl font-bold' }, 'Welcome to SCALP PRO'),
                    React.createElement('p', { className: 'text-muted-foreground' }, 'No active profile found. Please refresh to create one.')
                ),
                React.createElement(InstallPwaButton, null)
            )
        );
    }

    return React.createElement('div', { className: 'flex flex-col h-screen bg-background text-foreground' },
        React.createElement(BinanceConnectDialog, { profileName: profile, isOpen: isBinanceModalOpen, setIsOpen: setIsBinanceModalOpen, onConnect: handleConnect }),
        React.createElement('header', { className: 'p-4 border-b flex justify-between items-center' },
            React.createElement('h1', { className: 'text-xl font-bold' }, `SCALP PRO (Static) - ${profile}`),
            React.createElement('div', { className: 'flex gap-2' },
                React.createElement('button', { onClick: () => setIsBinanceModalOpen(true), className: 'button outline' }, 'Connect Binance'),
                React.createElement('button', { onClick: handleLogout, className: 'button destructive' }, 'Logout')
            )
        ),
        React.createElement('main', { className: 'flex-1 overflow-y-auto p-4' },
            React.createElement(PositionsTab, { profile: profile })
        )
    );
}

function App() {
    const [online, setOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed: ', error);
                    });
            });
        }
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!online) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center min-h-screen bg-background text-foreground' },
            React.createElement(Icon, { name: 'wifi-off', className: 'w-16 h-16 text-destructive' }),
            React.createElement('h1', { className: 'text-2xl font-bold mt-4' }, 'Connection Error'),
            React.createElement('p', { className: 'text-muted-foreground' }, 'This application requires an internet connection to function.')
        );
    }

    return React.createElement(DashboardPage);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
