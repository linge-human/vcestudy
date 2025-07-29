// ========== CONFIG ========
const CHAT_PROXY_URL = 'YOUR_PROXY_ENDPOINT'; // e.g. Vercel/Cloudflare/Heroku function
const NOTES_FOLDER = 'notes/'; // "notes/" directory in your repo

// ========== Chat State ============
let chats = [];
let currentChatIdx = -1;
let userSubjects = "Biology, Chemistry, Physics, Math Methods, Specialist Maths";
let userFocus = "";
let notesIndex = [];
let loadedNotes = {}; // {filename: content}

// ========== UI Handling ==============
const chatListEl = document.getElementById('chat-list');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const chatThreadEl = document.getElementById('chat-thread');
const focusHeaderEl = document.getElementById('focus-header');
const subjectsEl = document.getElementById('subjects');
const focusEl = document.getElementById('focus');
const notesListEl = document.getElementById('notes-list');
const notePreviewEl = document.getElementById('note-preview');

subjectsEl.addEventListener('input', e => { userSubjects = e.target.value; });
focusEl.addEventListener('input', e => { userFocus = e.target.value; updateFocus(); });

function updateFocus() {
  focusHeaderEl.textContent = userFocus ? `Focus: ${userFocus}` : '';
}

// ========== Multi-Chat ==============
function saveChats() {
  localStorage.setItem('vce-chats', JSON.stringify(chats));
  localStorage.setItem('vce-active', currentChatIdx);
}
function loadChats() {
  if(localStorage.getItem('vce-chats')) chats = JSON.parse(localStorage.getItem('vce-chats'));
  if(localStorage.getItem('vce-active')) currentChatIdx = Number(localStorage.getItem('vce-active'));
  if(!Array.isArray(chats)) chats = [];
  if(chats.length===0) { chats.push({title:'First chat', messages:[]}); currentChatIdx=0;}
}
function displayChatList() {
  chatListEl.innerHTML = '';
  chats.forEach((c,i)=>{
    let li = document.createElement('li');
    li.textContent = c.title || `Chat ${i+1}`;
    if(i==currentChatIdx) li.classList.add('selected');
    li.onclick = ()=>{ currentChatIdx=i; saveChats(); renderChat(); displayChatList(); }
    chatListEl.appendChild(li);
  });
}
function addChat(title="New chat") {
  chats.push({title, messages:[]});
  currentChatIdx=chats.length-1;
  saveChats(); 
  renderChat(); 
  displayChatList();
}
document.getElementById('chat-new').onclick=()=>{
  addChat();
  chatInputEl.focus();
};
function chatTitleFromContent(msg) {
  return (msg || "").slice(0,40).replace(/[\r\n]+/g,' ').trim() || "Chat";
}
// ========== Chat Message Logic ===========
chatFormEl.onsubmit = e => {
  e.preventDefault();
  sendMessage();
};
chatInputEl.addEventListener('keydown', e => {
  if(e.key==="Enter" && e.ctrlKey) { sendMessage(); }
});
function sendMessage() {
  let msg = chatInputEl.value.trim();
  if(!msg) return;
  chatInputEl.value='';
  const chat = chats[currentChatIdx];
  chat.messages.push({role:"user", content:msg});
  if(chat.title==='First chat' || !chat.title) chat.title = chatTitleFromContent(msg);
  saveChats(); 
  renderChat();
  getAIResponse(chat);
  displayChatList();
}
function renderChat() {
  const chat = chats[currentChatIdx];
  chatThreadEl.innerHTML = '';
  (chat.messages || []).forEach(m=>{
    const div = document.createElement('div');
    div.className = 'message ' + (m.role==='user'?'user':'assistant');
    const cont = document.createElement('div');
    cont.className = 'message-content';
    cont.innerHTML = m.content
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    div.appendChild(cont);
    chatThreadEl.appendChild(div);
  });
  chatThreadEl.scrollTop = 9e9;
}
updateFocus();
loadChats();
renderChat();
displayChatList();

// ========== Notes Logic (fetch all .md/.txt in notes/) =============
async function loadNotes() {
  // Use GitHub raw CDN e.g. https://raw.githubusercontent.com/<user>/<repo>/main/notes/
  // For static GH Pages, you must manually update notesList if not using API!
  // Example: grab a manifest `notes/index.json` containing files list
  try {
    const manifest = await fetch(NOTES_FOLDER+'index.json').then(res=>res.json());
    notesIndex = manifest.files || [];
  } catch {
    notesIndex = [];
  }
  notesListEl.innerHTML = '';
  notesIndex.forEach(f=>{
    let opt = document.createElement('option');
    opt.textContent = f;
    opt.value = f;
    notesListEl.appendChild(opt);
  });
  if(notesIndex[0]) loadNoteContent(notesIndex[0]);
}
notesListEl.onchange = ()=>{
  let f = notesListEl.value;
  if(f) loadNoteContent(f);
}
async function loadNoteContent(f) {
  try {
    let txt = await fetch(NOTES_FOLDER+f).then(r=>r.text());
    notePreviewEl.textContent = txt.slice(0,450);
    loadedNotes[f] = txt;
  } catch { notePreviewEl.textContent = ''; }
}
// Call loadNotes (but user must create notes/index.json!)
// [Example index.json: {"files":["bio1.md","chem2.txt"]}]
loadNotes();

// ========== AI Response via Proxy ============
async function getAIResponse(chat) {
  // Show placeholder/loading
  chat.messages.push({role:"assistant", content:"Thinking..."});
  renderChat();

  // Compose context: subjects, focus, last few messages, selected note
  let sysPrompt = `You are a private VCE study assistant, focused only on the user's VCE subjects: "${userSubjects}". The user's current focus is "${userFocus}". Use current official VCE textbook/guide references to inform your answers (e.g. Cambridge Chemistry 3/4 sec 9.3). If matching content is found in the provided notes, use it as evidence. Act like a warm human teacher. Answer directly, only as much as needed.`;

  const selectedNote = loadedNotes[notesListEl.value] || '';
  let context = [];
  if(selectedNote) context.push(`User note:\n${selectedNote.slice(0,2000)}`);

  // Use last 12 chat messages as context
  let history = chat.messages.slice(-12).filter(m=>m.role&&m.content);
  let messages = [
    {role:"system", content: sysPrompt + (context.length?("\n\n" + context.join("\n\n")):'')}
  ].concat(history.filter(m=>m.content!=="Thinking..."));

  // Call backend proxy 
  try {
    const res = await fetch(CHAT_PROXY_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages })
    });
    const data = await res.json();
    let reply = (data.choices && data.choices[0] && data.choices[0].message.content) || data.reply || "Error, couldn't get reply.";
    // Replace 'Thinking...'
    chat.messages.pop();
    chat.messages.push({role:"assistant", content:reply});
    saveChats(); renderChat();
  } catch(e) {
    chat.messages.pop();
    chat.messages.push({role:"assistant", content:"[Error contacting AI proxy]"});
    saveChats();renderChat();
  }
}
