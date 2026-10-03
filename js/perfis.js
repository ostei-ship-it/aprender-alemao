// Perfis locais: várias pessoas no mesmo aparelho, cada uma com seu progresso.
// Registro em localStorage: { ativo: "p1", lista: [{ id, nome }] }.
// O progresso de cada perfil fica em "aprender-alemao:progresso:<id>".
const CHAVE_PERFIS = "aprender-alemao:perfis";
const CHAVE_ANTIGA = "aprender-alemao:progresso"; // versões sem perfis
export const chaveProgresso = (id) => `${CHAVE_ANTIGA}:${id}`;

const temStorage = () => typeof localStorage !== "undefined";

function ler() {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_PERFIS));
    if (r && Array.isArray(r.lista) && r.lista.length) {
      if (!r.lista.some((p) => p.id === r.ativo)) r.ativo = r.lista[0].id;
      return r;
    }
  } catch {
    /* registro ausente ou corrompido: recria abaixo */
  }
  return null;
}

function gravar(r) {
  try {
    localStorage.setItem(CHAVE_PERFIS, JSON.stringify(r));
  } catch (e) {
    console.warn("Não foi possível salvar os perfis:", e);
  }
}

// Garante que existe ao menos um perfil; migra o progresso salvo antes dos perfis existirem.
function iniciar() {
  if (!temStorage()) return { ativo: "p1", lista: [{ id: "p1", nome: "Perfil 1" }] };
  let r = ler();
  if (r) return r;
  r = { ativo: "p1", lista: [{ id: "p1", nome: "Perfil 1" }] };
  try {
    const antigo = localStorage.getItem(CHAVE_ANTIGA);
    if (antigo) {
      localStorage.setItem(chaveProgresso("p1"), antigo);
      localStorage.removeItem(CHAVE_ANTIGA);
    }
  } catch {
    /* sem acesso ao storage: segue com o perfil vazio */
  }
  gravar(r);
  return r;
}

let registro = iniciar();

export const perfis = () => registro.lista;
export const perfilAtivo = () => registro.lista.find((p) => p.id === registro.ativo);

const limparNome = (nome) => String(nome || "").trim().replace(/\s+/g, " ").slice(0, 30);

export function criarPerfil(nome) {
  const n = limparNome(nome);
  if (!n) throw new Error("Digite um nome para o perfil.");
  if (registro.lista.some((p) => p.nome.toLowerCase() === n.toLowerCase())) throw new Error(`Já existe um perfil "${n}".`);
  let k = registro.lista.length + 1;
  while (registro.lista.some((p) => p.id === `p${k}`)) k++;
  const perfil = { id: `p${k}`, nome: n };
  registro.lista.push(perfil);
  gravar(registro);
  return perfil;
}

export function renomearPerfil(id, nome) {
  const n = limparNome(nome);
  if (!n) throw new Error("Digite um nome para o perfil.");
  if (registro.lista.some((p) => p.id !== id && p.nome.toLowerCase() === n.toLowerCase())) throw new Error(`Já existe um perfil "${n}".`);
  registro.lista.find((p) => p.id === id).nome = n;
  gravar(registro);
}

export function excluirPerfil(id) {
  if (registro.lista.length === 1) throw new Error("Não é possível excluir o único perfil.");
  registro.lista = registro.lista.filter((p) => p.id !== id);
  if (registro.ativo === id) registro.ativo = registro.lista[0].id;
  gravar(registro);
  try {
    localStorage.removeItem(chaveProgresso(id));
  } catch {
    /* ignora */
  }
}

// Troca de perfil: o progresso é carregado na abertura do app, por isso recarrega a página.
export function trocarPerfil(id, { recarregar = true } = {}) {
  if (!registro.lista.some((p) => p.id === id)) return;
  registro.ativo = id;
  gravar(registro);
  marcarEscolhido();
  if (recarregar) location.reload();
}

// "Quem vai estudar?" aparece uma vez por abertura do app quando há mais de um perfil.
const CHAVE_SESSAO = "aprender-alemao:perfil-escolhido";
export function precisaEscolher() {
  if (registro.lista.length < 2) return false;
  try {
    return sessionStorage.getItem(CHAVE_SESSAO) !== "1";
  } catch {
    return false;
  }
}
export function marcarEscolhido() {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, "1");
  } catch {
    /* ignora */
  }
}
