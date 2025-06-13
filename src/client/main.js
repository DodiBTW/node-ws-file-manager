let token = null;
let selectedFile = null;
let fileExtension = '';


function connectWebSocket(userId) {
  ws = new WebSocket('ws://localhost:8081');
  ws.onopen = () => {
    ws.send(JSON.stringify({ userId }));
  };
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'file-change' || msg.type === 'compression' || msg.message) {
        listFiles();
        if (msg.type === 'compression') {
          document.getElementById('compress-status').innerText = 'Compression terminée: ' + (msg.file || 'archive.zip');
        }
      }
    } catch {}
  };
  ws.onclose = () => {
    // Reconnexion automatique après 2 secondes, 3 tentatives
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        connectWebSocket(userId);
      }, 2000 * (i + 1));
    }
  };
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      token = data.token;
      document.getElementById('login').style.display = 'none';
      document.getElementById('file-manager').style.display = '';
      const userId = token.split('|')[0];
      connectWebSocket(userId);
      listFiles();
    } else {
      document.getElementById('login-status').innerText = 'Échec de connexion';
    }
  });
}

function listFiles() {
  fetch('/files', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => res.json())
  .then(files => {
    const ul = document.getElementById('file-list');
    ul.innerHTML = '';
    files.forEach(f => {
      const li = document.createElement('li');
      li.textContent = f.name;
      const del = document.createElement('button');
      li.appendChild(document.createElement('br'));
      del.textContent = 'Supprimer';
      del.onclick = () => deleteFile(f.name);
      li.appendChild(del);
      ul.appendChild(li);
      li.appendChild(document.createElement('br'));

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Télécharger';
      downloadBtn.onclick = () => downloadFile(f.name);
      li.appendChild(document.createElement('br'));
      li.appendChild(downloadBtn);

      ul.appendChild(li);
      li.appendChild(document.createElement('br'));
    });
  });
}

function onFileSelected() {
  const fileInput = document.getElementById('upload-file');
  if (fileInput.files.length > 0) {
    selectedFile = fileInput.files[0];
    const nameParts = selectedFile.name.split('.');
    fileExtension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
    const baseName = nameParts.join('.');
    document.getElementById('upload-filename').value = baseName;
    document.getElementById('upload-filename').disabled = false;
  }
}


function downloadFile(filename) {
  fetch('/download/' + encodeURIComponent(filename), {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => {
    if (!res.ok) {
      alert('Erreur lors du téléchargement');
      return;
    }
    return res.blob().then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
  });
}

function uploadFile() {
  if (!selectedFile) {
    document.getElementById('upload-status').innerText = 'Aucun fichier sélectionné';
    return;
  }
  const baseName = document.getElementById('upload-filename').value;
  const filename = baseName + fileExtension;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result.split(',')[1]; // base64
    fetch('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, filename, content })
    })
    .then(res => {
      if (res.ok) {
        document.getElementById('upload-file').value = '';
        document.getElementById('upload-filename').value = '';
        selectedFile = null;
        fileExtension = '';
        listFiles();
      } else {
        document.getElementById('upload-status').innerText = 'Erreur upload';
      }
    });
  };
  reader.readAsDataURL(selectedFile);
}

function deleteFile(filename) {
  fetch('/files/' + filename, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => {
    if (res.status === 204) {
      listFiles();
    }
  });
}

function compressFiles() {
  fetch('/compress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  .then(res => res.json())
  .then(data => {
    if (data.archive) {
      document.getElementById('compress-status').innerText = 'Archive créée: ' + data.archive;
    } else {
      document.getElementById('compress-status').innerText = 'Erreur lors de la compression';
    }
  });
}