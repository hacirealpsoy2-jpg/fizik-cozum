import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import ProblemSolver from './components/ProblemSolver.tsx';
import Login from './components/Auth.tsx';
import { User, UserRole, PhysicsSolution, Feedback, VerifiedExample } from './types';

// Initial Mock Users - Sadece ilk açılışta veritabanı boşsa kullanılır
const MOCK_USERS: User[] = [
  { username: 'admin', role: UserRole.ADMIN, isBanned: false, registrationDate: '2023-01-01' },
  { username: 'ogrenci1', role: UserRole.USER, isBanned: false, registrationDate: '2023-10-15', sessionLimitMinutes: 45 },
  { username: 'ogrenci2', role: UserRole.USER, isBanned: true, registrationDate: '2023-10-20' },
];

function App() {
  // KULLANICI VERİTABANI: LocalStorage'dan oku, yoksa Mock veriyi kullan
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('fizikAppUsers');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('login'); // login, home, admin
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  
  // Store "fine-tuned" examples in state
  const [verifiedExamples, setVerifiedExamples] = useState<VerifiedExample[]>(() => {
    const saved = localStorage.getItem('fizikAppVerifiedExamples');
    return saved ? JSON.parse(saved) : [];
  });

  // Settings State - Global Default
  const [globalSessionLimit, setGlobalSessionLimit] = useState<number>(() => {
    const saved = localStorage.getItem('appSessionLimit');
    return saved ? parseInt(saved) : 30; // Default 30 minutes
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // KULLANICI VERİLERİNİ SÜREKLİ KAYDET (PERSISTENCE)
  // Kullanıcı listesi değiştiğinde (süre ayarı, ban, yeni kayıt) otomatik kaydet
  useEffect(() => {
    localStorage.setItem('fizikAppUsers', JSON.stringify(users));
  }, [users]);

  // EĞİTİM VERİSİNİ KAYDET
  useEffect(() => {
    localStorage.setItem('fizikAppVerifiedExamples', JSON.stringify(verifiedExamples));
  }, [verifiedExamples]);

  // Auth Effects & Login Check
  useEffect(() => {
    const storedUser = localStorage.getItem('fizikAppUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Veritabanındaki en güncel kullanıcı bilgisini bul
      const dbUser = users.find(u => u.username === user.username);
      
      // Eğer kullanıcı silinmişse oturumu kapat
      if (!dbUser) {
        localStorage.removeItem('fizikAppUser');
        return;
      }

      // Ban kontrolü
      if (dbUser.isBanned && dbUser.role !== UserRole.ADMIN) {
        localStorage.removeItem('fizikAppUser');
        return;
      }
      
      // State'i güncelle
      setCurrentUser(dbUser);
      
      if (dbUser.role === UserRole.USER) {
        // Kişiye özel süre varsa onu, yoksa genel süreyi kullan
        const limit = dbUser.sessionLimitMinutes !== undefined ? dbUser.sessionLimitMinutes : globalSessionLimit;
        setTimeLeft(limit * 60);
      }
      setCurrentView(dbUser.role === UserRole.ADMIN ? 'admin' : 'home');
    }
  }, [users, globalSessionLimit]); 

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (currentUser && currentUser.role === UserRole.USER && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleLogout();
            alert("Kullanım süreniz doldu! Devam etmek için lütfen yönetici ile iletişime geçin.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentUser, timeLeft]);

  const handleLogin = (loginAttemptUser: User) => {
    // 1. Veritabanından kullanıcıyı bul
    const dbUser = users.find(u => u.username === loginAttemptUser.username);
    
    // Admin bypass
    if (loginAttemptUser.role === UserRole.ADMIN) {
       // Admin kullanıcı yoksa oluştur (güvenlik için)
       if (!dbUser) {
         setUsers([...users, loginAttemptUser]);
       }
       setCurrentUser(loginAttemptUser);
       localStorage.setItem('fizikAppUser', JSON.stringify(loginAttemptUser));
       setCurrentView('admin');
       return;
    }

    if (!dbUser) {
      alert("Kayıt bulunamadı. Lütfen önce kayıt olun.");
      return;
    }

    if (dbUser.isBanned) {
      alert("Bu hesaba erişim engellenmiştir.");
      return;
    }
    
    // Login successful
    setCurrentUser(dbUser);
    localStorage.setItem('fizikAppUser', JSON.stringify(dbUser));
    
    if (dbUser.role === UserRole.USER) {
      // SÜRE HESAPLAMA MANTIĞI: Özel süre varsa onu kullan, yoksa genel süre
      const limit = dbUser.sessionLimitMinutes !== undefined ? dbUser.sessionLimitMinutes : globalSessionLimit;
      setTimeLeft(limit * 60);
    }

    setCurrentView('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fizikAppUser');
    setCurrentView('login');
    setTimeLeft(0);
  };

  const handleRegister = (username: string) => {
    if (users.find(u => u.username === username)) {
      alert("Kullanıcı adı alınmış.");
      return false;
    }
    const newUser: User = {
      username,
      role: UserRole.USER,
      isBanned: false,
      registrationDate: new Date().toISOString().split('T')[0],
      // Yeni kullanıcının özel süresi undefined olur (Genel süreyi kullanır)
    };
    
    // 1. Veritabanını güncelle (State güncellemesi asenkron çalışır)
    setUsers(prevUsers => [...prevUsers, newUser]);
    
    // 2. State güncellemesini beklemeden (Optimistic Update) kullanıcıyı doğrudan giriş yapmış sayıyoruz.
    // Bu sayede "Kayıt Başarısız" hatası veya kullanıcı bulunamadı sorunu çözülür.
    setCurrentUser(newUser);
    localStorage.setItem('fizikAppUser', JSON.stringify(newUser));
    
    // Süre ayarını başlat (Genel varsayılan)
    const limit = globalSessionLimit;
    setTimeLeft(limit * 60);

    // Ana sayfaya yönlendir
    setCurrentView('home');
    
    return true;
  };

  const handleBanUser = (username: string) => {
    setUsers(users.map(u => 
      u.username === username ? { ...u, isBanned: !u.isBanned } : u
    ));
  };

  const handleUpdateUserLimit = (username: string, minutes: number) => {
    // Kişiye özel süre güncelleme
     setUsers(users.map(u => 
      u.username === username ? { ...u, sessionLimitMinutes: minutes } : u
    ));
    alert(`${username} için süre sınırı ${minutes} dakika olarak ayarlandı.`);
  };

  const handleFeedbackSubmit = (question: string, solution: PhysicsSolution) => {
    const newFeedback: Feedback = {
      id: Math.random().toString(36).substr(2, 9),
      userQuestion: question,
      aiResponse: solution,
      status: 'pending'
    };
    setFeedbacks(prev => [newFeedback, ...prev]);
  };

  const handleAddToKnowledgeBase = (example: VerifiedExample) => {
    setVerifiedExamples(prev => [...prev, example]);
  };

  const handleUpdateGlobalSettings = (newSettings: { sessionLimit: number }) => {
    setGlobalSessionLimit(newSettings.sessionLimit);
    localStorage.setItem('appSessionLimit', newSettings.sessionLimit.toString());
    alert("Genel varsayılan süre güncellendi.");
  };

  // View Routing
  const renderView = () => {
    if (!currentUser) {
      return <Login onLogin={handleLogin} onRegister={handleRegister} />;
    }

    if (currentView === 'admin') {
       if (currentUser.role !== UserRole.ADMIN) {
         setCurrentView('home');
         return null;
       }
       return (
         <AdminDashboard 
           users={users} 
           feedbacks={feedbacks}
           onBanUser={handleBanUser} 
           onUpdateUserLimit={handleUpdateUserLimit}
           onUpdateSettings={handleUpdateGlobalSettings}
           onFeedbackSubmit={handleFeedbackSubmit}
           onAddToKnowledgeBase={handleAddToKnowledgeBase}
           currentSessionLimit={globalSessionLimit}
           verifiedExamples={verifiedExamples}
         />
       );
    }

    if (currentView === 'home') {
      return (
        <ProblemSolver 
          onFeedbackSubmit={handleFeedbackSubmit} 
          verifiedExamples={verifiedExamples} 
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        timeLeft={timeLeft}
        onNavigate={(view) => {
           if (view === 'admin' && currentUser?.role !== UserRole.ADMIN) return;
           if (view === 'login' && currentUser) return;
           setCurrentView(view);
        }} 
      />
      <main className="flex-grow">
        {renderView()}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; 2025 FizikÇözücü Pro. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;