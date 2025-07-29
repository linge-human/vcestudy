:root {
  --bg: #fff;
  --text: #111;
  --highlight: #ededed;
  --border: #e0e0e0;
  --sidebar: #fafafa;
}

body {
  margin: 0; padding: 0;
  font-family: 'Inter', 'SF Mono', monospace, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  height: 100vh;
  min-height: 100vh;
}

.main-container { display: flex; }

.sidebar {
  background: var(--sidebar);
  color: var(--text);
  min-width: 260px;
  max-width: 280px;
  height: 100vh;
  box-sizing: border-box;
  border-right: 1.5px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px 16px 22px 18px;
}

.sidebar label {
  font-size: 0.97rem;
  color: #444;
  margin-top: 18px;
}

.sidebar input,
.sidebar select {
  width: 98%;
  padding: 7px 8px;
  font-size: 1rem;
  margin-bottom: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.chat-list {
  list-style: none;
  margin: 8px 0 18px 0;
  padding: 0;
  border-bottom: 1px solid #ececec;
  max-height: 130px;
  overflow-y: auto;
}
.chat-list li {
  padding: 5px 3px;
  font-size: 0.97rem;
  color: #222;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}
.chat-list li.selected, .chat-list li:hover {
  background: var(--highlight);
}

.chat-new {
  background: var(--highlight);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 5px 11px;
  font-size: 1.03rem;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
}

#note-preview {
  font-size: 0.95rem;
  color: #555;
  background: var(--bg);
  margin-top: 6px;
  padding: 3px;
  max-height: 80px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 3px;
}

.chat-area {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  height: 100vh;
  min-width: 0;
  flex: 1;
}

.chat-header {
  height: 38px;
  line-height: 38px;
  border-bottom: 1.5px solid var(--border);
  font-size: 1.13rem;
  color: #888;
  padding: 0 21px;
  background: var(--bg);
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 22px;
}

.message {
  max-width: 94%;
  margin-bottom: 22px;
  word-break: break-word;
}
.message.user { text-align: right; }
.message.assistant { text-align: left; }
.message .message-content {
  display: inline-block;
  padding: 13px 20px;
  line-height: 1.7;
  border-radius: 6px;
  max-width: 98vw;
  font-size: 1rem;
}
.message.user .message-content {
  background: #000;
  color: #fff;
}
.message.assistant .message-content {
  background: var(--highlight);
  color: var(--text);
}

.input-area {
  background: #f5f5f5;
  border-top: 1.1px solid var(--border);
  padding: 14px 20px;
  display: flex;
  gap: 9px;
}
.chat-input {
  flex: 1;
  padding: 10px 11px;
  font-size: 1.07rem;
  background: var(--bg);
  color: var(--text);
  border: 1.1px solid var(--border);
  border-radius: 5px;
  resize: vertical;
  min-height: 33px; max-height: 120px;
}
.send-btn {
  background: #111;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-weight: 600;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 1rem;
  margin-left: 3px;
}
.send-btn:hover { background: #343434; }

@media (max-width: 900px) {
  .sidebar { min-width: 120px; padding: 14px 3px; }
  .chat-header { font-size: 1rem; padding: 0 8px;}
  .input-area { padding: 9px 4px;}
}

::-webkit-scrollbar { width: 4px; background: #f5f5f5; }
::-webkit-scrollbar-thumb { background: #ccc; }
