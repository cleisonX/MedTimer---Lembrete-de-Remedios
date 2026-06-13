// ==================== CONFIGURAÇÕES ====================
let medicamentos = [];
let ultimosEventos = [];
let usuarioAtual = null;

// ==================== SISTEMA DE LOGIN ====================

function getUsuarios() {
    const usuarios = localStorage.getItem('medtimer_usuarios');
    return usuarios ? JSON.parse(usuarios) : [];
}

function salvarUsuarios(usuarios) {
    localStorage.setItem('medtimer_usuarios', JSON.stringify(usuarios));
}

function login(email, senha) {
    const usuarios = getUsuarios();
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);
    
    if (usuario) {
        usuarioAtual = usuario;
        localStorage.setItem('medtimer_usuario_atual', JSON.stringify(usuario));
        return true;
    }
    return false;
}

function cadastrar(nome, email, senha) {
    const usuarios = getUsuarios();
    
    if (usuarios.find(u => u.email === email)) {
        return { sucesso: false, erro: "E-mail já cadastrado" };
    }
    
    if (senha.length < 6) {
        return { sucesso: false, erro: "Senha deve ter pelo menos 6 caracteres" };
    }
    
    const novoUsuario = {
        id: Date.now(),
        nome: nome,
        email: email,
        senha: senha,
        criadoEm: new Date().toISOString()
    };
    
    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);
    
    return { sucesso: true };
}

function logout() {
    usuarioAtual = null;
    localStorage.removeItem('medtimer_usuario_atual');
}

function verificarSessao() {
    const saved = localStorage.getItem('medtimer_usuario_atual');
    if (saved) {
        usuarioAtual = JSON.parse(saved);
        return true;
    }
    return false;
}

// ==================== FUNÇÃO PARA LIMPAR CAMPOS ====================

function limparCampos() {
    document.getElementById('remedio').value = '';
    document.getElementById('intervaloHoras').value = '8';
    document.getElementById('duracaoDias').value = '7';
    document.getElementById('horaInicio').value = '08:00';
    
    // Resetar data para hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataInicio').value = hoje;
    
    document.getElementById('resultadoArea').style.display = 'none';
    
    ultimosEventos = [];
    
    if (document.getElementById('loginEmail')) {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginSenha').value = '';
    }
    if (document.getElementById('cadastroNome')) {
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroEmail').value = '';
        document.getElementById('cadastroSenha').value = '';
        document.getElementById('cadastroConfirmar').value = '';
    }
}

// ==================== BANCO DE DADOS POR USUÁRIO ====================

function carregarMedicamentos() {
    if (!usuarioAtual) return;
    
    const key = `medtimer_dados_${usuarioAtual.id}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
        medicamentos = JSON.parse(saved);
    } else {
        medicamentos = [];
    }
    
    renderizarListaMedicamentos();
}

function salvarMedicamentos() {
    if (!usuarioAtual) return;
    
    const key = `medtimer_dados_${usuarioAtual.id}`;
    localStorage.setItem(key, JSON.stringify(medicamentos));
    renderizarListaMedicamentos();
    atualizarContador();
}

function atualizarContador() {
    const total = medicamentos.length;
    console.log(`📊 Total de remédios: ${total}`);
}

// ==================== GERAR AGENDA ====================

function gerarAgenda(medOverride = null) {
    const remedio = medOverride ? medOverride.nome : document.getElementById('remedio').value.trim();
    if (!remedio) {
        alert("⚠️ Digite o nome do remédio");
        return false;
    }

    const intervaloHoras = medOverride ? medOverride.intervalo : parseInt(document.getElementById('intervaloHoras').value);
    let duracaoDias = medOverride ? medOverride.duracaoDias : parseInt(document.getElementById('duracaoDias').value);
    if (isNaN(duracaoDias)) duracaoDias = 0;
    
    const dataInicioStr = medOverride ? medOverride.dataInicio : document.getElementById('dataInicio').value;
    const horaInicioStr = medOverride ? medOverride.horaInicio : document.getElementById('horaInicio').value;
    
    if (!dataInicioStr || !horaInicioStr) {
        alert("⚠️ Selecione data e hora de início");
        return false;
    }
    
    const [ano, mes, dia] = dataInicioStr.split('-').map(Number);
    const [horaInicio, minutoInicio] = horaInicioStr.split(':').map(Number);
    
    const dataHoraInicio = new Date(ano, mes - 1, dia, horaInicio, minutoInicio, 0, 0);
    
    let dataFim;
    if (duracaoDias === 0) {
        dataFim = new Date(dataHoraInicio);
        dataFim.setDate(dataFim.getDate() + 14);
    } else {
        dataFim = new Date(dataHoraInicio);
        dataFim.setDate(dataFim.getDate() + duracaoDias - 1);
        dataFim.setHours(23, 59, 59, 999);
    }
    
    const eventos = [];
    let horarioAtual = new Date(dataHoraInicio);
    let totalDoses = 0;
    
    while (horarioAtual <= dataFim) {
        const fimEvento = new Date(horarioAtual);
        fimEvento.setMinutes(horarioAtual.getMinutes() + 30);
        
        eventos.push({
            titulo: `💊 Tomar ${remedio}`,
            inicio: new Date(horarioAtual),
            fim: fimEvento,
            descricao: `Dose de ${remedio} - a cada ${intervaloHoras} horas`
        });
        totalDoses++;
        horarioAtual = new Date(horarioAtual.getTime() + (intervaloHoras * 60 * 60 * 1000));
        if (totalDoses > 200) break;
    }
    
    if (eventos.length === 0) {
        alert("⚠️ Nenhum evento gerado");
        return false;
    }
    
    ultimosEventos = eventos;
    exibirResultados(remedio, eventos, duracaoDias);
    exibirAcoesAdicionais();
    return true;
}

function exibirResultados(remedio, eventos, duracaoDias) {
    const container = document.getElementById('listaAlarmes');
    const agora = new Date();
    
    let tomadas = eventos.filter(ev => ev.inicio <= agora).length;
    let restantes = eventos.length - tomadas;
    
    let statusTexto = '';
    if (duracaoDias > 0) {
        const primeiraDose = eventos[0].inicio;
        const ultimaDose = eventos[eventos.length - 1].inicio;
        statusTexto = `
            <div style="background:#fed7d7; padding:12px; border-radius:16px; margin-bottom:16px;">
                ⏱️ TRATAMENTO DE ${duracaoDias} DIAS
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="background:#e9d8fd; padding: 8px 16px; border-radius: 12px;">
                    📅 Início: ${primeiraDose.toLocaleDateString('pt-BR')}
                </div>
                <div style="background:#e9d8fd; padding: 8px 16px; border-radius: 12px;">
                    📅 Fim: ${ultimaDose.toLocaleDateString('pt-BR')}
                </div>
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="background:#c6f6d5; padding: 8px 16px; border-radius: 12px;">
                    ✅ Já tomadas: ${tomadas}
                </div>
                <div style="background:#fed7d7; padding: 8px 16px; border-radius: 12px;">
                    ⏳ Restantes: ${restantes}
                </div>
                <div style="background:#e9d8fd; padding: 8px 16px; border-radius: 12px;">
                    💊 Total: ${eventos.length}
                </div>
            </div>
        `;
    } else {
        statusTexto = `
            <div style="background:#c6f6d5; padding:12px; border-radius:16px; margin-bottom:16px;">
                🔄 TRATAMENTO CONTÍNUO
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="background:#c6f6d5; padding: 8px 16px; border-radius: 12px;">
                    ✅ Já tomadas: ${tomadas}
                </div>
                <div style="background:#fed7d7; padding: 8px 16px; border-radius: 12px;">
                    ⏳ Restantes: ${restantes}
                </div>
                <div style="background:#e9d8fd; padding: 8px 16px; border-radius: 12px;">
                    💊 Total: ${eventos.length}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `<strong>📋 Histórico completo do tratamento:</strong><br><br>${statusTexto}<hr>`;
    
    let ultimaData = '';
    eventos.forEach(ev => {
        const dataAtual = ev.inicio.toLocaleDateString('pt-BR');
        const diaSemana = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][ev.inicio.getDay()];
        const horaStr = ev.inicio.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        const isPassado = ev.inicio <= agora;
        const horaNum = ev.inicio.getHours();
        const iconeMadrugada = horaNum >= 0 && horaNum < 6 ? '🌙' : '☀️';
        
        if (ultimaData !== dataAtual) {
            if (ultimaData !== '') container.innerHTML += `<div style="margin-top:8px;"></div>`;
            container.innerHTML += `<div style="font-weight:bold; margin-top:12px; color:#553c9a;">📅 ${diaSemana}, ${dataAtual}</div>`;
            ultimaData = dataAtual;
        }
        
        container.innerHTML += `
            <div class="alarme-item" style="${isPassado ? 'opacity:0.6; text-decoration:line-through;' : ''}">
                ${iconeMadrugada} <strong>${horaStr}</strong> - ${ev.titulo}
                ${isPassado ? '<span style="font-size:0.7rem;"> ✅ tomada</span>' : '<span style="font-size:0.7rem;"> ⏳ pendente</span>'}
            </div>
        `;
    });
    
    document.getElementById('resultadoArea').style.display = 'block';
}

function exibirAcoesAdicionais() {
    const acoesDiv = document.getElementById('acoesAdicionais');
    if (!acoesDiv) return;
    
    acoesDiv.innerHTML = `
        <hr>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;">
            <button id="whatsappBtn" class="btn-whats">📱 Enviar horários no WhatsApp</button>
            <button id="copiarListaBtn" style="background:#4a5568; color:white; font-weight:bold; border:none; padding:14px 20px; border-radius:40px; cursor:pointer;">📋 Copiar horários</button>
            <button id="exportarICSBtn" style="background:#3182ce; color:white; font-weight:bold; border:none; padding:14px 20px; border-radius:40px; cursor:pointer;">📅 Baixar ICS</button>
        </div>
    `;
    
    document.getElementById('whatsappBtn')?.addEventListener('click', enviarWhatsApp);
    document.getElementById('copiarListaBtn')?.addEventListener('click', copiarHorarios);
    document.getElementById('exportarICSBtn')?.addEventListener('click', exportarICS);
}

function enviarWhatsApp() {
    if (!ultimosEventos || ultimosEventos.length === 0) {
        alert("⚠️ Calcule os horários primeiro");
        return;
    }
    
    const remedio = document.getElementById('remedio').value.trim() || "Remédio";
    let texto = `🍃 *LEMBRETE DE REMÉDIO* 🍃\n\n`;
    texto += `💊 *${remedio}*\n`;
    texto += `⏱️ Total de doses: ${ultimosEventos.length}\n\n`;
    texto += `📅 *HORÁRIOS:*\n`;
    
    let ultimaData = '';
    ultimosEventos.slice(0, 25).forEach(ev => {
        const dataAtual = ev.inicio.toLocaleDateString('pt-BR');
        const horaStr = ev.inicio.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        const icone = ev.inicio.getHours() >= 0 && ev.inicio.getHours() < 6 ? '🌙' : '☀️';
        
        if (ultimaData !== dataAtual) {
            if (ultimaData !== '') texto += `\n`;
            texto += `\n📌 *${dataAtual}*:\n`;
            ultimaData = dataAtual;
        }
        texto += `   • ${icone} ${horaStr}\n`;
    });
    
    if (ultimosEventos.length > 25) {
        texto += `\n✨ + mais ${ultimosEventos.length - 25} horários`;
    }
    
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
    mostrarToast('📱 Redirecionando para o WhatsApp...');
}

function copiarHorarios() {
    if (!ultimosEventos || ultimosEventos.length === 0) {
        alert("⚠️ Calcule os horários primeiro");
        return;
    }
    
    let texto = `🔔 HORÁRIOS DO REMÉDIO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    let ultimaData = '';
    
    ultimosEventos.forEach(ev => {
        const dataAtual = ev.inicio.toLocaleDateString('pt-BR');
        const dia = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][ev.inicio.getDay()];
        const horaStr = ev.inicio.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        
        if (ultimaData !== dataAtual) {
            if (ultimaData !== '') texto += `\n`;
            texto += `${dia}, ${dataAtual}:\n`;
            ultimaData = dataAtual;
        }
        texto += `  • ${horaStr}\n`;
    });
    
    navigator.clipboard.writeText(texto);
    mostrarToast("📋 Horários copiados!");
}

function exportarICS() {
    if (!ultimosEventos || ultimosEventos.length === 0) {
        alert("⚠️ Calcule os horários primeiro");
        return;
    }
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MedTimer//PT//BR\nCALSCALE:GREGORIAN\n";
    
    ultimosEventos.forEach(ev => {
        const start = formatICSDate(ev.inicio);
        const end = formatICSDate(ev.fim);
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `SUMMARY:${ev.titulo}\n`;
        icsContent += `DTSTART:${start}\n`;
        icsContent += `DTEND:${end}\n`;
        icsContent += `DESCRIPTION:${ev.descricao}\n`;
        icsContent += `BEGIN:VALARM\nTRIGGER:-PT15M\nACTION:DISPLAY\nDESCRIPTION:Lembrete\nEND:VALARM\n`;
        icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], {type: 'text/calendar'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `medicamento_${Date.now()}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
    mostrarToast("✅ Arquivo ICS gerado!");
}

function formatICSDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    const hours = String(date.getHours()).padStart(2,'0');
    const minutes = String(date.getMinutes()).padStart(2,'0');
    const seconds = String(date.getSeconds()).padStart(2,'0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// ==================== MANIPULAÇÃO DE REMÉDIOS ====================

function renderizarListaMedicamentos() {
    const container = document.getElementById('listaRemedios');
    if (!container) return;
    
    if (medicamentos.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Nenhum remédio cadastrado</div>';
        return;
    }
    
    container.innerHTML = '';
    medicamentos.forEach((med, idx) => {
        const duracaoTexto = med.duracaoDias === 0 ? '🔄 Contínuo' : `⏱️ ${med.duracaoDias} dias`;
        const [ano, mes, dia] = med.dataInicio.split('-');
        const dataInicioFormatada = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
        
        const div = document.createElement('div');
        div.className = 'med-item';
        div.innerHTML = `
            <button class="delete-med" data-idx="${idx}">✖️</button>
            <div class="med-nome">💊 ${med.nome}</div>
            <div class="med-info">⏱️ A cada ${med.intervalo}h | Início: ${dataInicioFormatada} ${med.horaInicio}</div>
            <div class="med-duracao">📆 ${duracaoTexto}</div>
        `;
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-med')) return;
            carregarMedicamentoParaEdicao(med);
        });
        container.appendChild(div);
    });
    
    document.querySelectorAll('.delete-med').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            if (confirm('⚠️ Remover este remédio?')) {
                medicamentos.splice(idx, 1);
                salvarMedicamentos();
                mostrarToast('✅ Remédio removido');
                if (medicamentos.length === 0) {
                    document.getElementById('resultadoArea').style.display = 'none';
                }
                // Limpar campos após remover
                limparCampos();
            }
        });
    });
}

function carregarMedicamentoParaEdicao(med) {
    document.getElementById('remedio').value = med.nome;
    document.getElementById('intervaloHoras').value = med.intervalo;
    document.getElementById('duracaoDias').value = med.duracaoDias || 0;
    document.getElementById('dataInicio').value = med.dataInicio;
    document.getElementById('horaInicio').value = med.horaInicio;
    gerarAgenda(med);
    document.getElementById('resultadoArea').scrollIntoView({ behavior: 'smooth' });
}

function salvarRemedioAtual() {
    const nome = document.getElementById('remedio').value.trim();
    if (!nome) {
        alert("⚠️ Digite o nome do remédio");
        return;
    }
    
    const intervalo = parseInt(document.getElementById('intervaloHoras').value);
    if (isNaN(intervalo) || intervalo < 1) {
        alert("⚠️ Intervalo inválido");
        return;
    }
    
    let duracaoDias = parseInt(document.getElementById('duracaoDias').value);
    if (isNaN(duracaoDias)) duracaoDias = 0;
    
    const dataInicio = document.getElementById('dataInicio').value;
    const horaInicio = document.getElementById('horaInicio').value;
    
    if (!dataInicio || !horaInicio) {
        alert("⚠️ Selecione data e hora de início");
        return;
    }
    
    const novoMed = {
        nome: nome,
        intervalo: intervalo,
        duracaoDias: duracaoDias,
        dataInicio: dataInicio,
        horaInicio: horaInicio,
        criadoEm: new Date().toISOString()
    };
    
    const idxExistente = medicamentos.findIndex(m => m.nome.toLowerCase() === nome.toLowerCase());
    if (idxExistente !== -1) {
        if (confirm(`⚠️ "${nome}" já existe. Atualizar?`)) {
            medicamentos[idxExistente] = novoMed;
            mostrarToast(`🔄 "${nome}" atualizado!`);
        } else {
            return;
        }
    } else {
        medicamentos.push(novoMed);
        mostrarToast(`💾 "${nome}" salvo!`);
    }
    
    salvarMedicamentos();
    gerarAgenda(novoMed);
    
    limparCampos();
}

// ==================== UI E TRANSIÇÕES ====================

function mostrarTelaPrincipal() {
    document.getElementById('telaLogin').style.display = 'none';
    document.getElementById('telaPrincipal').style.display = 'block';
    document.getElementById('footer').style.display = 'block';
    
    if (usuarioAtual) {
        document.getElementById('userName').innerText = usuarioAtual.nome;
    }
    
    limparCampos();
    carregarMedicamentos();
}

function mostrarTelaLogin() {
    document.getElementById('telaLogin').style.display = 'block';
    document.getElementById('telaPrincipal').style.display = 'none';
    document.getElementById('footer').style.display = 'none';
    
    // Limpar campos de login e cadastro
    if (document.getElementById('loginEmail')) {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginSenha').value = '';
    }
    if (document.getElementById('cadastroNome')) {
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroEmail').value = '';
        document.getElementById('cadastroSenha').value = '';
        document.getElementById('cadastroConfirmar').value = '';
    }
    
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('cadastroForm').style.display = 'none';
}

function mostrarToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EVENTOS ====================

function configurarEventos() {
    document.getElementById('btnLogin').addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value.trim();
        const senha = document.getElementById('loginSenha').value;
        
        if (!email || !senha) {
            mostrarToast("⚠️ Preencha e-mail e senha");
            return;
        }
        
        if (login(email, senha)) {
            mostrarToast(`✅ Bem-vindo, ${usuarioAtual.nome}!`);
            mostrarTelaPrincipal();
        } else {
            mostrarToast("❌ E-mail ou senha incorretos");
        }
    });
    
    document.getElementById('btnCadastro').addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('cadastroForm').style.display = 'block';
        // Limpar campos de cadastro
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroEmail').value = '';
        document.getElementById('cadastroSenha').value = '';
        document.getElementById('cadastroConfirmar').value = '';
    });
    
    document.getElementById('btnVoltarLogin').addEventListener('click', () => {
        document.getElementById('cadastroForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        // Limpar campos de login
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginSenha').value = '';
    });
    
    document.getElementById('btnRegistrar').addEventListener('click', () => {
        const nome = document.getElementById('cadastroNome').value.trim();
        const email = document.getElementById('cadastroEmail').value.trim();
        const senha = document.getElementById('cadastroSenha').value;
        const confirmar = document.getElementById('cadastroConfirmar').value;
        
        if (!nome || !email || !senha) {
            mostrarToast("⚠️ Preencha todos os campos");
            return;
        }
        
        if (senha !== confirmar) {
            mostrarToast("⚠️ As senhas não coincidem");
            return;
        }
        
        const resultado = cadastrar(nome, email, senha);
        
        if (resultado.sucesso) {
            mostrarToast("✅ Cadastro realizado! Faça login.");
            document.getElementById('cadastroForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginSenha').value = '';
            // Limpar campos de cadastro
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroSenha').value = '';
            document.getElementById('cadastroConfirmar').value = '';
        } else {
            mostrarToast(`❌ ${resultado.erro}`);
        }
    });
    
    document.getElementById('btnSair').addEventListener('click', () => {
        logout();
        mostrarTelaLogin();
        limparCampos();
        mostrarToast("👋 Até logo!");
    });
    
    document.getElementById('calcularBtn').addEventListener('click', () => {
        const med = {
            nome: document.getElementById('remedio').value,
            intervalo: parseInt(document.getElementById('intervaloHoras').value),
            duracaoDias: parseInt(document.getElementById('duracaoDias').value) || 0,
            dataInicio: document.getElementById('dataInicio').value,
            horaInicio: document.getElementById('horaInicio').value
        };
        if (med.nome) {
            gerarAgenda(med);
        } else {
            alert("⚠️ Digite o nome do remédio");
        }
    });
    
    document.getElementById('salvarBtn').addEventListener('click', salvarRemedioAtual);
}

// ==================== INICIALIZAR ====================

function init() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataInicio').value = hoje;
    
    configurarEventos();
    
    if (verificarSessao()) {
        mostrarTelaPrincipal();
    } else {
        mostrarTelaLogin();
    }
}

init();
