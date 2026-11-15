import type { CommandDictionary, Locale, SystemCommand } from './types.js';

/**
 * Sistem komutlarının dillere göre varsayılan karşılıkları.
 *
 * DİKKAT: Buradaki komutlar yalnızca "görünen" yazımlardır. Motorun içindeki
 * işlem her zaman SystemCommand (JOIN_TEAM, LEAVE_TEAM, ...) değeridir.
 * Yayıncı bu yazımları panelden değiştirebilir; işlem mantığı değişmez.
 */
export const COMMAND_DICTIONARY: CommandDictionary = {
  tr: {
    JOIN_TEAM: { action: 'JOIN_TEAM', label: 'Takıma katıl', phrases: ['gir', 'katil'] },
    LEAVE_TEAM: { action: 'LEAVE_TEAM', label: 'Takımdan ayrıl', phrases: ['cik', 'ayril'] },
    HELP: { action: 'HELP', label: 'Yardım', phrases: ['yardim'] },
    SHOW_SCORE: { action: 'SHOW_SCORE', label: 'Skor tablosu', phrases: ['skor'] },
    CHANGE_TEAM: { action: 'CHANGE_TEAM', label: 'Takım değiştir', phrases: ['takimdegistir'] },
  },
  en: {
    JOIN_TEAM: { action: 'JOIN_TEAM', label: 'Join a team', phrases: ['join', 'enter'] },
    LEAVE_TEAM: { action: 'LEAVE_TEAM', label: 'Leave your team', phrases: ['leave', 'exit'] },
    HELP: { action: 'HELP', label: 'Help', phrases: ['help'] },
    SHOW_SCORE: { action: 'SHOW_SCORE', label: 'Scoreboard', phrases: ['score'] },
    CHANGE_TEAM: { action: 'CHANGE_TEAM', label: 'Switch team', phrases: ['switch', 'changeteam'] },
  },
  es: {
    JOIN_TEAM: { action: 'JOIN_TEAM', label: 'Unirse a un equipo', phrases: ['entrar', 'unirse'] },
    LEAVE_TEAM: { action: 'LEAVE_TEAM', label: 'Salir del equipo', phrases: ['salir'] },
    HELP: { action: 'HELP', label: 'Ayuda', phrases: ['ayuda'] },
    SHOW_SCORE: { action: 'SHOW_SCORE', label: 'Marcador', phrases: ['puntuacion', 'marcador'] },
    CHANGE_TEAM: { action: 'CHANGE_TEAM', label: 'Cambiar de equipo', phrases: ['cambiarequipo'] },
  },
  de: {
    JOIN_TEAM: { action: 'JOIN_TEAM', label: 'Team beitreten', phrases: ['beitreten', 'eintreten'] },
    LEAVE_TEAM: { action: 'LEAVE_TEAM', label: 'Team verlassen', phrases: ['verlassen'] },
    HELP: { action: 'HELP', label: 'Hilfe', phrases: ['hilfe'] },
    SHOW_SCORE: { action: 'SHOW_SCORE', label: 'Punkte', phrases: ['punkte'] },
    CHANGE_TEAM: { action: 'CHANGE_TEAM', label: 'Team wechseln', phrases: ['teamwechsel'] },
  },
  fr: {
    JOIN_TEAM: { action: 'JOIN_TEAM', label: 'Rejoindre une équipe', phrases: ['rejoindre', 'entrer'] },
    LEAVE_TEAM: { action: 'LEAVE_TEAM', label: 'Quitter son équipe', phrases: ['quitter'] },
    HELP: { action: 'HELP', label: 'Aide', phrases: ['aide'] },
    SHOW_SCORE: { action: 'SHOW_SCORE', label: 'Score', phrases: ['score'] },
    CHANGE_TEAM: { action: 'CHANGE_TEAM', label: 'Changer d’équipe', phrases: ['changerequipe'] },
  },
};

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; flag: string; code: string }> = {
  tr: { native: 'Türkçe', english: 'Turkish', flag: '🇹🇷', code: 'TR' },
  en: { native: 'English', english: 'English', flag: '🇬🇧', code: 'EN' },
  es: { native: 'Español', english: 'Spanish', flag: '🇪🇸', code: 'ES' },
  de: { native: 'Deutsch', english: 'German', flag: '🇩🇪', code: 'DE' },
  fr: { native: 'Français', english: 'French', flag: '🇫🇷', code: 'FR' },
};

/** Oyun ekranı (OBS) için çevrilebilir arayüz metinleri. */
export interface LiveUiStrings {
  commands: string;
  joinHint: string;
  leaveHint: string;
  switchHint: string;
  helpHint: string;
  scoreHint: string;
  lobbyTitle: string;
  lobbySubtitle: string;
  waitingForPlayers: string;
  startingSoon: string;
  roundLabel: string;
  roundEndsIn: string;
  scoreboard: string;
  team: string;
  soldiers: string;
  castle: string;
  players: string;
  winner: string;
  draw: string;
  roundOver: string;
  nextRoundSoon: string;
  joined: string;
  left: string;
  switched: string;
  giftAttack: string;
  likeShield: string;
  commentSoldiers: string;
  castleDown: string;
  roundStarted: string;
  noPlayersYet: string;
  testMode: string;
  commandPlaceholder: string;
  send: string;
  live: string;
  offline: string;
  poweredBy: string;
  hp: string;
  joinWith: string;
  matchNotRunning: string;
  yourTeam: string;
  watching: string;
  points: string;
  topFans: string;
  helpNotice: string;
  scoreNotice: string;
  connecting: string;
  won: string;
}

const LIVE_UI: Record<Locale, LiveUiStrings> = {
  tr: {
    commands: 'Komutlar',
    joinHint: 'Takımına katılmak için',
    leaveHint: 'Takımdan ayrılmak için',
    switchHint: 'Takım değiştirmek için',
    helpHint: 'Tüm komutları görmek için',
    scoreHint: 'Skoru görmek için',
    lobbyTitle: 'Savaş alanı hazır',
    lobbySubtitle: 'Takımını seç, komutla katıl ve kaleni savun.',
    waitingForPlayers: 'İzleyiciler bekleniyor',
    startingSoon: 'Birazdan başlıyor',
    roundLabel: 'Tur',
    roundEndsIn: 'Kalan süre',
    scoreboard: 'Skor tablosu',
    team: 'Takım',
    soldiers: 'Asker',
    castle: 'Kale',
    players: 'Oyuncu',
    winner: 'Kazanan',
    draw: 'Berabere',
    roundOver: 'Tur bitti',
    nextRoundSoon: 'Yeni tur birazdan başlıyor',
    joined: 'katıldı',
    left: 'ayrıldı',
    switched: 'takım değiştirdi',
    giftAttack: 'özel saldırı gönderdi',
    likeShield: 'savunma kalkanı verdi',
    commentSoldiers: 'asker desteği gönderdi',
    castleDown: 'kalesi yıkıldı',
    roundStarted: 'Tur başladı',
    noPlayersYet: 'Henüz oyuncu yok — ilk komutu sen yaz!',
    testMode: 'TEST MODU',
    commandPlaceholder: 'Komut yaz: !gir takım',
    send: 'Gönder',
    live: 'CANLI',
    offline: 'YAYIN KAPALI',
    poweredBy: 'Rook Works',
    hp: 'Can',
    joinWith: 'Katılmak için',
    matchNotRunning: 'Maç başlamadı',
    yourTeam: 'Takımın',
    watching: 'izleniyor',
    points: 'puan',
    topFans: 'En aktif taraftarlar',
    helpNotice: 'Tüm komutlar ekranın altında listeleniyor.',
    scoreNotice: 'Skor tablosu ekranın üst kısmında yer alıyor.',
    connecting: 'Yayına bağlanılıyor...',
    won: 'kazandı',
  },
  en: {
    commands: 'Commands',
    joinHint: 'To join your team',
    leaveHint: 'To leave your team',
    switchHint: 'To switch teams',
    helpHint: 'To see all commands',
    scoreHint: 'To see the score',
    lobbyTitle: 'The battlefield is ready',
    lobbySubtitle: 'Pick a team, join with a command, defend your castle.',
    waitingForPlayers: 'Waiting for viewers',
    startingSoon: 'Starting soon',
    roundLabel: 'Round',
    roundEndsIn: 'Time left',
    scoreboard: 'Scoreboard',
    team: 'Team',
    soldiers: 'Soldiers',
    castle: 'Castle',
    players: 'Players',
    winner: 'Winner',
    draw: 'Draw',
    roundOver: 'Round over',
    nextRoundSoon: 'A new round starts soon',
    joined: 'joined',
    left: 'left the battle',
    switched: 'switched teams',
    giftAttack: 'sent a special attack',
    likeShield: 'granted a defense shield',
    commentSoldiers: 'sent soldier support',
    castleDown: 'castle was destroyed',
    roundStarted: 'Round started',
    noPlayersYet: 'No players yet — be the first to type a command!',
    testMode: 'TEST MODE',
    commandPlaceholder: 'Type a command: !join team',
    send: 'Send',
    live: 'LIVE',
    offline: 'OFFLINE',
    poweredBy: 'Fan Battle',
    hp: 'HP',
    joinWith: 'Join with',
    matchNotRunning: 'Match not running',
    yourTeam: 'Your team',
    watching: 'watching',
    points: 'points',
    topFans: 'Top fans',
    helpNotice: 'All commands are listed at the bottom of the screen.',
    scoreNotice: 'The scoreboard is shown at the top of the screen.',
    connecting: 'Connecting to the live game...',
    won: 'won',
  },
  es: {
    commands: 'Comandos',
    joinHint: 'Para unirte a tu equipo',
    leaveHint: 'Para salir de tu equipo',
    switchHint: 'Para cambiar de equipo',
    helpHint: 'Para ver todos los comandos',
    scoreHint: 'Para ver el marcador',
    lobbyTitle: 'El campo de batalla está listo',
    lobbySubtitle: 'Elige un equipo, únete con un comando y defiende tu castillo.',
    waitingForPlayers: 'Esperando espectadores',
    startingSoon: 'Empieza pronto',
    roundLabel: 'Ronda',
    roundEndsIn: 'Tiempo restante',
    scoreboard: 'Marcador',
    team: 'Equipo',
    soldiers: 'Soldados',
    castle: 'Castillo',
    players: 'Jugadores',
    winner: 'Ganador',
    draw: 'Empate',
    roundOver: 'Ronda terminada',
    nextRoundSoon: 'Una nueva ronda empieza pronto',
    joined: 'se unió',
    left: 'abandonó la batalla',
    switched: 'cambió de equipo',
    giftAttack: 'envió un ataque especial',
    likeShield: 'otorgó un escudo de defensa',
    commentSoldiers: 'envió refuerzos',
    castleDown: 'castillo destruido',
    roundStarted: 'La ronda comenzó',
    noPlayersYet: 'Aún no hay jugadores: ¡sé el primero en escribir un comando!',
    testMode: 'MODO DE PRUEBA',
    commandPlaceholder: 'Escribe un comando: !entrar equipo',
    send: 'Enviar',
    live: 'EN VIVO',
    offline: 'SIN CONEXIÓN',
    poweredBy: 'Fan Battle',
    hp: 'Vida',
    joinWith: 'Únete con',
    matchNotRunning: 'Partida no iniciada',
    yourTeam: 'Tu equipo',
    watching: 'viendo',
    points: 'puntos',
    topFans: 'Aficionados destacados',
    helpNotice: 'Todos los comandos aparecen en la parte inferior de la pantalla.',
    scoreNotice: 'El marcador se muestra en la parte superior de la pantalla.',
    connecting: 'Conectando con la partida en vivo...',
    won: 'ganó',
  },
  de: {
    commands: 'Befehle',
    joinHint: 'Um deinem Team beizutreten',
    leaveHint: 'Um dein Team zu verlassen',
    switchHint: 'Um das Team zu wechseln',
    helpHint: 'Um alle Befehle zu sehen',
    scoreHint: 'Um den Punktestand zu sehen',
    lobbyTitle: 'Das Schlachtfeld ist bereit',
    lobbySubtitle: 'Wähle ein Team, tritt per Befehl bei und verteidige deine Burg.',
    waitingForPlayers: 'Warte auf Zuschauer',
    startingSoon: 'Beginnt gleich',
    roundLabel: 'Runde',
    roundEndsIn: 'Verbleibende Zeit',
    scoreboard: 'Punktestand',
    team: 'Team',
    soldiers: 'Soldaten',
    castle: 'Burg',
    players: 'Spieler',
    winner: 'Sieger',
    draw: 'Unentschieden',
    roundOver: 'Runde beendet',
    nextRoundSoon: 'Eine neue Runde beginnt bald',
    joined: 'ist beigetreten',
    left: 'hat verlassen',
    switched: 'hat das Team gewechselt',
    giftAttack: 'hat einen Spezialangriff gesendet',
    likeShield: 'hat einen Verteidigungsschild gegeben',
    commentSoldiers: 'hat Verstärkung gesendet',
    castleDown: 'Burg zerstört',
    roundStarted: 'Runde gestartet',
    noPlayersYet: 'Noch keine Spieler — schreibe den ersten Befehl!',
    testMode: 'TESTMODUS',
    commandPlaceholder: 'Befehl eingeben: !beitreten team',
    send: 'Senden',
    live: 'LIVE',
    offline: 'OFFLINE',
    poweredBy: 'Fan Battle',
    hp: 'LP',
    joinWith: 'Beitreten mit',
    matchNotRunning: 'Match läuft nicht',
    yourTeam: 'Dein Team',
    watching: 'schauen zu',
    points: 'Punkte',
    topFans: 'Top-Fans',
    helpNotice: 'Alle Befehle stehen unten auf dem Bildschirm.',
    scoreNotice: 'Der Punktestand wird oben auf dem Bildschirm angezeigt.',
    connecting: 'Verbindung zum Live-Spiel...',
    won: 'gewinnt',
  },
  fr: {
    commands: 'Commandes',
    joinHint: 'Pour rejoindre ton équipe',
    leaveHint: 'Pour quitter ton équipe',
    switchHint: 'Pour changer d’équipe',
    helpHint: 'Pour voir toutes les commandes',
    scoreHint: 'Pour voir le score',
    lobbyTitle: 'Le champ de bataille est prêt',
    lobbySubtitle: 'Choisis une équipe, rejoins-la avec une commande et défends ton château.',
    waitingForPlayers: 'En attente des spectateurs',
    startingSoon: 'Bientôt',
    roundLabel: 'Manche',
    roundEndsIn: 'Temps restant',
    scoreboard: 'Tableau des scores',
    team: 'Équipe',
    soldiers: 'Soldats',
    castle: 'Château',
    players: 'Joueurs',
    winner: 'Vainqueur',
    draw: 'Match nul',
    roundOver: 'Manche terminée',
    nextRoundSoon: 'Une nouvelle manche commence bientôt',
    joined: 'a rejoint',
    left: 'a quitté la bataille',
    switched: 'a changé d’équipe',
    giftAttack: 'a envoyé une attaque spéciale',
    likeShield: 'a offert un bouclier de défense',
    commentSoldiers: 'a envoyé des renforts',
    castleDown: 'château détruit',
    roundStarted: 'La manche a commencé',
    noPlayersYet: 'Aucun joueur pour l’instant — sois le premier à écrire une commande !',
    testMode: 'MODE TEST',
    commandPlaceholder: 'Écris une commande : !rejoindre équipe',
    send: 'Envoyer',
    live: 'EN DIRECT',
    offline: 'HORS LIGNE',
    poweredBy: 'Fan Battle',
    hp: 'PV',
    joinWith: 'Rejoindre avec',
    matchNotRunning: 'Match non démarré',
    yourTeam: 'Ton équipe',
    watching: 'spectateurs',
    points: 'points',
    topFans: 'Meilleurs supporters',
    helpNotice: 'Toutes les commandes sont affichées en bas de l’écran.',
    scoreNotice: 'Le tableau des scores est affiché en haut de l’écran.',
    connecting: 'Connexion à la partie en direct...',
    won: 'remporte',
  },
};

export function liveUi(locale: Locale): LiveUiStrings {
  return LIVE_UI[locale] ?? LIVE_UI.tr;
}

export const SYSTEM_COMMAND_ORDER: SystemCommand[] = [
  'JOIN_TEAM',
  'CHANGE_TEAM',
  'LEAVE_TEAM',
  'SHOW_SCORE',
  'HELP',
];

/** Dil değiştiğinde yayıncıya gösterilen bilgilendirme. */
export function defaultPhrasesFor(locale: Locale, action: SystemCommand): string[] {
  return COMMAND_DICTIONARY[locale]?.[action]?.phrases ?? COMMAND_DICTIONARY.tr[action].phrases;
}

export function systemCommandLabel(locale: Locale, action: SystemCommand): string {
  return COMMAND_DICTIONARY[locale]?.[action]?.label ?? COMMAND_DICTIONARY.tr[action].label;
}
