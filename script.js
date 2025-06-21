const socket = io();
let username = prompt("Enter your name:");
socket.emit("set username", username);

const messages = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const userList = document.getElementById("userList");

// Track users
let users = [];

// Listen for user list updates from server
socket.on("user list", (userArr) => {
  users = userArr;
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    if (u === username) li.classList.add("active");
    userList.appendChild(li);
  });
});

// --- Notification Support ---
if (window.Notification && Notification.permission !== "granted") {
  Notification.requestPermission();
}
let windowFocused = true;
window.onfocus = () => (windowFocused = true);
window.onblur = () => (windowFocused = false);

// --- Emoji Picker ---
const emojiBtn = document.getElementById("emojiBtn");
let emojiPanel;
emojiBtn.onclick = () => {
  if (emojiPanel) {
    emojiPanel.remove();
    emojiPanel = null;
    return;
  }
  emojiPanel = document.createElement("div");
  emojiPanel.className = "emoji-panel";
  const emojis = [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","😷","🤒","🤕","🤢","🤮","🥴","😇","🥳"
  ];
  emojis.forEach(e => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn";
    btn.textContent = e;
    btn.onclick = () => {
      input.value += e;
      input.focus();
    };
    emojiPanel.appendChild(btn);
  });
  emojiBtn.parentNode.insertBefore(emojiPanel, emojiBtn.nextSibling);
};
document.addEventListener("click", (e) => {
  if (emojiPanel && !emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.remove();
    emojiPanel = null;
  }
});

// --- Speech-to-Text ---
const micBtn = document.getElementById("micBtn");
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    input.value += event.results[0][0].transcript;
  };
}
micBtn.onclick = () => {
  if (recognition) recognition.start();
  else alert("Speech recognition not supported in this browser.");
};

// --- File Sending ---
const fileInput = document.getElementById("fileInput");
const fileBtn = document.getElementById("fileBtn");
const filePreview = document.getElementById("filePreview");
let selectedFiles = [];
fileBtn.onclick = () => fileInput.click();
fileInput.onchange = () => {
  selectedFiles = Array.from(fileInput.files);
  filePreview.innerHTML = "";
  selectedFiles.forEach(f => {
    if (f.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      img.style.maxWidth = "100px";
      img.style.maxHeight = "100px";
      filePreview.appendChild(img);
    } else if (f.type.startsWith("video/")) {
      const vid = document.createElement("video");
      vid.src = URL.createObjectURL(f);
      vid.controls = true;
      vid.style.maxWidth = "120px";
      filePreview.appendChild(vid);
    } else {
      const span = document.createElement("span");
      span.textContent = f.name;
      filePreview.appendChild(span);
    }
  });
};

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    socket.emit("chat message", input.value);
    input.value = "";
  }
  if (selectedFiles.length > 0) {
    selectedFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("file message", {
          from: username,
          fileName: f.name,
          fileType: f.type,
          fileData: reader.result
        });
      };
      reader.readAsDataURL(f);
    });
    fileInput.value = "";
    selectedFiles = [];
    filePreview.innerHTML = "";
  }
});

socket.on("chat message", function ({ from, text }) {
  const item = document.createElement("div");
  item.classList.add("message");
  item.textContent = `${from}: ${text}`;
  item.classList.add(from === username ? "sent" : "received");
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
  if (!windowFocused && from !== username && window.Notification && Notification.permission === "granted") {
    new Notification(`New message from ${from}`, { body: text });
  }
});

socket.on("file message", function ({ from, fileName, fileType, fileData }) {
  const item = document.createElement("div");
  item.classList.add("message");
  item.classList.add(from === username ? "sent" : "received");
  let content = `${from}: `;
  if (fileType.startsWith("image/")) {
    content += `<img src='${fileData}' style='max-width:150px;max-height:150px;'/>`;
  } else if (fileType.startsWith("video/")) {
    content += `<video src='${fileData}' controls style='max-width:180px;'></video>`;
  } else {
    content += `<a href='${fileData}' download='${fileName}'>${fileName}</a>`;
  }
  item.innerHTML = content;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
  if (!windowFocused && from !== username && window.Notification && Notification.permission === "granted") {
    new Notification(`File from ${from}`, { body: fileName });
  }
});

// Dark/light mode toggle
const toggleBtn = document.getElementById("toggleMode");
toggleBtn.onclick = () => {
  document.body.classList.toggle("dark-mode");
};
