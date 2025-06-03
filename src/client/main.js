let token = null;
let selectedFile = null;
let fileExtension = '';

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
        document.getElementById('upload-status').innerText = 'Fichier uploadé';
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