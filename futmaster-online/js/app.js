// app.js - FutMaster v3.3 (Sincronização Firebase)
// Importe este código no arquivo js/app.js

// ----------------------------------------------------
// 1. CONFIGURAÇÃO FIREBASE
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAuKyiDOpKsq11iO0c7v8NvQYqVdbZr4Ko",
  authDomain: "futuriasmaster.firebaseapp.com",
  databaseURL: "https://uriasfutmaster2-default-rtdb.firebaseio.com/", // Este é o ponto chave
  projectId: "futuriasmaster",
  storageBucket: "futuriasmaster.firebasestorage.app",
  messagingSenderId: "698635901166",
  appId: "1:698635901166:web:670975316797b14eb07bff",
  measurementId: "G-XLTG46ZKZP"
};

// Inicialização das variáveis Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref('futmaster_state'); // Referência principal no Realtime Database

// ----------------------------------------------------
// 2. ESTADO E VARIÁVEIS GLOBAIS
// ----------------------------------------------------
let state = {
  playersQueue: [],
  teams: [],
  payments: {},
  clearPaymentsOnLoad: false,
  timerSeconds: 7 * 60,
  soundOn: true,
  timerRunning: false, // Novo: Estado do timer
  timerInterval: null // Novo: ID do intervalo
};

let queueList, countQueue, teamsContainer, countTeams, paymentsList, timerDisplay, chkClearOnLoad, chkSound, inputPlayer, btnAdd, firebaseStatus;

// ----------------------------------------------------
// 3. FUNÇÕES DE UTILIDADE E RENDERIZAÇÃO
// ----------------------------------------------------

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return ${m}:${sec};
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function escapeHtml(s = '') {
  return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initDOMRefs() {
  queueList = document.getElementById('queueList');
  countQueue = document.getElementById('countQueue');
  teamsContainer = document.getElementById('teamsContainer');
  countTeams = document.getElementById('countTeams');
  paymentsList = document.getElementById('paymentsList');
  timerDisplay = document.getElementById('timerDisplay');
  chkClearOnLoad = document.getElementById('chkClearOnLoad');
  chkSound = document.getElementById('chkSound');
  inputPlayer = document.getElementById('inputPlayer');
  btnAdd = document.getElementById('btnAdd');
  firebaseStatus = document.getElementById('firebaseStatus'); // Novo elemento de status
}

/**
 * Atualiza o estado local com os dados do Firebase e renderiza a tela.
 * @param {object} newState - Novo estado vindo do Firebase.
 */
function updateStateAndRender(newState) {
  // O estado do timer deve ser mantido localmente se estiver em execução,
  // ou ser puxado do Firebase.
  const localTimerRunning = state.timerRunning;
  const localTimerInterval = state.timerInterval;
  
  state = { ...state,
    ...newState
  };

  // Restaura o estado de execução do timer para o estado local, pois o Firebase
  // não deve controlar o intervalo JS.
  state.timerRunning = localTimerRunning;
  state.timerInterval = localTimerInterval;

  // Lógica para limpar pagamentos ao carregar
  if (state.clearPaymentsOnLoad && !newState.payments) {
    state.payments = {};
    // Como esta é uma exceção de "limpeza", disparamos um novo push
    pushStateToFirebase(); 
  }

  renderAll();
}

function renderAll() {
  renderQueue();
  renderTeams();
  renderPayments();
  timerDisplay.textContent = formatTime(state.timerSeconds);
  chkClearOnLoad.checked = !!state.clearPaymentsOnLoad;
  chkSound.checked = !!state.soundOn;
}

function renderQueue() {
  // (Código de renderização da fila - idêntico ao original)
  queueList.innerHTML = '';
  state.playersQueue.forEach((name, idx) => {
    const div = document.createElement('div');
    div.className = 'row';
    div.draggable = true;
    div.dataset.origin = 'queue';
    div.dataset.idx = idx;
    div.innerHTML = `<div class="pos">${idx+1}</div><div class="name">${escapeHtml(name)}</div><div class="actions">
      <button class="tiny edit-queue" data-idx="${idx}">✏</button>
      <button class="tiny up-queue" data-idx="${idx}">🔼</button>
      <button class="tiny down-queue" data-idx="${idx}">🔽</button>
      <button class="tiny move-to-team" data-idx="${idx}">↪ Mover</button>
      <button class="tiny remove-queue" data-idx="${idx}">🗑</button>
    </div>`;
    // Drag and drop event listeners aqui... (Simplificado para o prompt)
    queueList.appendChild(div);
  });
  countQueue.textContent = state.playersQueue.length;
}

function renderTeams() {
  // (Código de renderização de times - idêntico ao original)
  teamsContainer.innerHTML = '';
  state.teams.forEach((team, tIndex) => {
    const teamLabel = String.fromCharCode(65 + tIndex);
    let statusLabel = '',
      statusClass = '';
    if (tIndex === 0) {
      statusLabel = 'Jogando';
      statusClass = 'status-playing-1';
    } else if (tIndex === 1) {
      statusLabel = 'Jogando';
      statusClass = 'status-playing-2';
    } else if (tIndex === 2) {
      statusLabel = 'Próximo';
      statusClass = 'status-next';
    } else {
      statusLabel = 'Aguardando';
      statusClass = 'status-waiting';
    }
    const card = document.createElement('div');
    card.className = 'team-card';
    const playersHtml = team.map((p, idx) => `<div class="player-item" draggable="true" data-origin="team" data-team="${tIndex}" data-idx="${idx}" >
      <div class="player-role">${idx+1}</div><div class="player-name">${escapeHtml(p)}</div>
      <div style="display:flex;gap:6px">
        <button class="tiny edit-team" data-team="${tIndex}" data-idx="${idx}">✏</button>
        <button class="tiny move-up-team" data-team="${tIndex}" data-idx="${idx}">🔼</button>
        <button class="tiny move-down-team" data-team="${tIndex}" data-idx="${idx}">🔽</button>
        <button class="tiny move-player" data-team="${tIndex}" data-idx="${idx}">↔ Mover</button>
        <button class="tiny remove-team-player" data-team="${tIndex}" data-idx="${idx}">⤵ Enviar à fila</button>
      </div></div>`).join('') || '<div class="small">Vazio</div>';
    card.innerHTML = `<div class="team-title"><div class="team-heading ${statusClass}">Time ${teamLabel} — <span class="team-status">${statusLabel}</span></div><div class="small">${team.length}/5</div></div><div class="team-players" data-teamindex="${tIndex}" ondragover="allowDrop(event)" ondrop="onDropToTeam(event, ${tIndex})">${playersHtml}</div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
        <button class="tiny btn-pull-next" data-team="${tIndex}">Puxar próximo (5)</button>
        <button class="tiny btn-loser" data-team="${tIndex}">Time ${teamLabel} perdeu</button>
        <button class="tiny btn-move-up-card" data-team="${tIndex}">⬆ Subir time</button>
        <button class="tiny btn-move-down-card" data-team="${tIndex}">⬇ Descer time</button>
        <button class="tiny btn-move-to-pos" data-team="${tIndex}">↕ Mover para posição</button>
      </div>`;
    teamsContainer.appendChild(card);
  });
  // ... (EventListeners para arrastar/soltar - omitido por brevidade, mas deve estar completo no código original)
  countTeams.textContent = state.teams.length;
}

function renderPayments() {
  // (Código de renderização de pagamentos - idêntico ao original)
  paymentsList.innerHTML = '';
  const allPlayers = [...new Set([...state.playersQueue, ...state.teams.flat()])].sort(); // Lista única de jogadores
  
  allPlayers.forEach(name => {
    const checked = !!state.payments[name] ? 'checked' : '';
    const div = document.createElement('div');
    div.className = 'row payment-row';
    div.innerHTML = `<label style="display:flex;align-items:center;width:100%;gap:8px">
      <input type="checkbox" data-player="${escapeHtml(name)}" onchange="togglePayment(this)" ${checked}> 
      <div class="name" style="font-weight:600">${escapeHtml(name)}</div>
    </label>`;
    paymentsList.appendChild(div);
  });
}

// ----------------------------------------------------
// 4. FUNÇÕES FIREBASE (Sincronização)
// ----------------------------------------------------

/**
 * Envia o estado local (state) para o Firebase (WRITE).
 * Chamada após cada ação que altera o estado.
 */
function pushStateToFirebase() {
  // Ignoramos a variável timerSeconds/timerRunning para que o Firebase não sobreponha
  // o estado de execução do timer em outros clientes.
  const stateToSave = { ...state
  };
  delete stateToSave.timerInterval;
  delete stateToSave.timerRunning;

  dbRef.set(stateToSave)
    .then(() => {
      firebaseStatus.textContent = 'Sincronizado';
    })
    .catch(error => {
      console.error("Erro ao salvar no Firebase:", error);
      firebaseStatus.textContent = 'Erro de Sincronização';
    });
}

/**
 * Configura o ouvinte para carregar dados do Firebase (READ).
 * Chamada apenas uma vez no início.
 */
function initFirebase() {
  firebaseStatus.textContent = 'Conectando...';

  // onValue é a chave para o TEMPO REAL.
  dbRef.on('value', (snapshot) => {
    const data = snapshot.val();

    if (data) {
      updateStateAndRender(data);
      firebaseStatus.textContent = 'Online';
      // Tentativa de puxar o tempo do localStorage como fallback para o timer,
      // pois o Realtime Database é melhor para o estado compartilhado.
      const localTimer = localStorage.getItem('futmaster_timer_time');
      if (localTimer) state.timerSeconds = Number(localTimer);
    } else {
      // Se o banco de dados estiver vazio, inicializa com estado padrão e salva.
      firebaseStatus.textContent = 'Iniciando (DB Vazio)';
      pushStateToFirebase();
    }
  }, (error) => {
    console.error("Erro de leitura do Firebase:", error);
    firebaseStatus.textContent = 'ERRO! Verifique regras.';
  });
}

// ----------------------------------------------------
// 5. FUNÇÕES DE AÇÃO (Com Push de Estado)
// ----------------------------------------------------

// ** Ações da Fila **
function addPlayer(name) {
  if (name && !state.playersQueue.includes(name)) {
    state.playersQueue.push(name);
    pushStateToFirebase(); // <--- CHAVE: SALVAR NO FIREBASE
    inputPlayer.value = '';
  }
}

function togglePayment(checkbox) {
  const name = checkbox.dataset.player;
  if (checkbox.checked) {
    state.payments[name] = true;
  } else {
    delete state.payments[name];
  }
  pushStateToFirebase(); // <--- CHAVE: SALVAR NO FIREBASE
  renderPayments();
}

// ... Outras funções de ação (Sortear, Formar Times, Mover, etc.)

// Exemplo de Formar Times (Formar 10 primeiros)
document.getElementById('btnFormTeams').addEventListener('click', () => {
  if (state.playersQueue.length < 10) return alert('É necessário pelo menos 10 jogadores na fila.');

  // Pega os 10 primeiros e remove da fila
  const playersToMove = state.playersQueue.splice(0, 10);
  shuffle(playersToMove);

  // Cria times A e B
  const teamA = playersToMove.slice(0, 5);
  const teamB = playersToMove.slice(5, 10);
  state.teams = [teamA, teamB];

  pushStateToFirebase(); // <--- CHAVE: SALVAR NO FIREBASE
});

// Exemplo de Limpar Tudo
document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('Tem certeza que deseja limpar a fila, times e pagamentos (Nova Noite)?')) {
    state.playersQueue = [];
    state.teams = [];
    state.payments = {};
    pushStateToFirebase(); // <--- CHAVE: SALVAR NO FIREBASE
  }
});

// ** Configurações **
chkClearOnLoad.addEventListener('change', (e) => {
  state.clearPaymentsOnLoad = e.target.checked;
  // Apenas salva a configuração local, pois é uma regra do navegador
  pushStateToFirebase(); 
});

// ... (Outros Event Listeners para botões de ação)

// ----------------------------------------------------
// 6. LÓGICA DO CRONÔMETRO (Local, com persistência básica)
// ----------------------------------------------------

const sound = new Audio('audio/whistle.mp3'); // Assumindo que você tem um arquivo de áudio

function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  state.timerInterval = setInterval(() => {
    if (state.timerSeconds > 0) {
      state.timerSeconds--;
      // Salva o tempo atual localmente para persistência
      localStorage.setItem('futmaster_timer_time', state.timerSeconds); 
      timerDisplay.textContent = formatTime(state.timerSeconds);
    } else {
      // Tempo esgotado
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      timerDisplay.textContent = "FIM!";
      if (state.soundOn) sound.play();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
}

function resetTimer() {
  pauseTimer();
  state.timerSeconds = 7 * 60; // 7 minutos
  localStorage.setItem('futmaster_timer_time', state.timerSeconds);
  timerDisplay.textContent = formatTime(state.timerSeconds);
}

document.getElementById('startBtn').addEventListener('click', startTimer);
document.getElementById('pauseBtn').addEventListener('click', pauseTimer);
document.getElementById('resetBtnTimer').addEventListener('click', resetTimer);
document.getElementById('btnTestWhistle').addEventListener('click', () => {
  if (state.soundOn) sound.play();
});
chkSound.addEventListener('change', (e) => state.soundOn = e.target.checked);

// Event listener para adicionar jogador pelo Enter
inputPlayer.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addPlayer(inputPlayer.value.trim());
  }
});

// ----------------------------------------------------
// 7. INICIALIZAÇÃO
// ----------------------------------------------------
window.onload = () => {
  initDOMRefs();
  initFirebase(); // Inicia a conexão e o ouvinte em tempo real
};