const NOTES_FOLDER = 'notes/';

let chats = [];
let currentChatIdx = -1;
let userSubjects = "Biology, Chemistry, Physics, Math Methods, Specialist Maths";
let userFocus = "";
let notesIndex = [];
let loadedNotes = {};
let openaiKey = '';

const chatListEl = document.getElementById('chat-list');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const chatThreadEl = document.getElementById('chat-thread');
const focusHeaderEl = document.getElementById('focus-header');
const subjectsEl = document.getElementById('subjects');
const focusEl = document.getElementById('focus');
const notesListEl = document.getElementById('notes-list');
const notePreviewEl = document.getElementById('note-preview');

// === API Key UI ===
const apiKeyEl = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const clearKeyBtn = document.getElementById('clear-key');
saveKeyBtn.onclick = ()=>{
  openaiKey = apiKeyEl.value.trim();
  if(!openaiKey.startsWith('sk-')) {alert("That looks like an invalid OpenAI key (should start with sk-)"); return; }
  sessionStorage.setItem('openai-key', openaiKey);
  apiKeyEl.value = ''; apiKeyEl.placeholder = 'API key saved!';
};
clearKeyBtn.onclick = ()=>{
  openaiKey = '';
  sessionStorage.removeItem('openai-key');
  apiKeyEl.value = '';
  apiKeyEl.placeholder = 'Paste API key here';
};
// On load, check if there's a saved one
window.addEventListener('DOMContentLoaded', ()=>{
  if(sessionStorage.getItem('openai-key')) {
    openaiKey = sessionStorage.getItem('openai-key');
    apiKeyEl.placeholder = 'API key loaded';
  }
});

// === Input Logic ===
subjectsEl.addEventListener('input', e => { userSubjects = e.target.value; });
focusEl.addEventListener('input', e => { userFocus = e.target.value; updateFocus(); });
function updateFocus() {
  focusHeaderEl.textContent = userFocus ? `Focus: ${userFocus}` : '';
}

// === Multi-Chat Logic ===
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

// === Chat Msg logic ===
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

// === Notes Logic
async function loadNotes() {
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
};
async function loadNoteContent(f) {
  try {
    let txt = await fetch(NOTES_FOLDER+f).then(r=>r.text());
    notePreviewEl.textContent = txt.slice(0,450);
    loadedNotes[f] = txt;
  } catch { notePreviewEl.textContent = ''; }
}
loadNotes();

// === AI Response via OpenAI API ===
async function getAIResponse(chat) {
  // API key
  if(!openaiKey) {
    alert('Please paste your OpenAI API key in the sidebar first!');
    return;
  }
  // Show placeholder/loading
  chat.messages.push({role:"assistant", content:"Thinking..."});
  renderChat();

  // Compose context
  let sysPrompt = `You are a private VCE study assistant, focused only on the user's VCE subjects: "${userSubjects}". The user's current focus is "${userFocus}". Use current official VCE textbook/guide references to inform your answers (e.g. Cambridge Chemistry 3/4 sec 9.3). If matching content is found in the provided notes, use it as evidence. Act like a warm human teacher. Answer directly, only as much as needed.`;

  const selectedNote = loadedNotes[notesListEl.value] || '';
  let context = [];
  if(selectedNote) context.push(`User note:\n${selectedNote.slice(0,2000)}`);

  // Use last 12 messages
  let history = chat.messages.slice(-12).filter(m=>m.role&&m.content);
  let messages = [
    {role:"system", content: sysPrompt + (context.length?("\n\n" + context.join("\n\n")):'')}
  ].concat(history.filter(m=>m.content!=="Thinking..."));

  // Call OpenAI API directly
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // or "gpt-4" if you want
        messages,
        temperature: 0.4,
        max_tokens: 750,
      }),
    });

    const data = await response.json();
    let reply = (data.choices && data.choices[0] && data.choices[0].message.content) || data.reply || "Error, couldn't get reply.";
    // Replace 'Thinking...'
    chat.messages.pop();
    chat.messages.push({role:"assistant", content:reply});
    saveChats();
    renderChat();
  } catch(e) {
    chat.messages.pop();
    chat.messages.push({role:"assistant", content:"[Error contacting OpenAI]"});
    saveChats();renderChat();
  }
}
