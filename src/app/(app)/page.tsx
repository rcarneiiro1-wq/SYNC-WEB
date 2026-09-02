import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { NOME_COOKIE_USUARIO, validarCookieSessao } from "@/lib/auth-usuario";
import { FileText, Ship, Award } from "lucide-react";

type Cartao = {
  titulo: string;
  descricao: string;
  icone: React.ElementType;
  corIcone: string;
  corFundoIcone: string;
  href?: string;
  notaSeDesabilitado?: string;
};

const CARTOES: Cartao[] = [
  {
    titulo: "Criar RDO",
    descricao: "Preencha e registre o relatório diário de obra.",
    icone: FileText,
    corIcone: "#3D6FA6",
    corFundoIcone: "#E8F0F9",
    notaSeDesabilitado: "Disponível no aplicativo desktop (funciona offline, embarcado)",
  },
  {
    titulo: "Gerar Relatório de Embarque",
    descricao: "Emita relatórios detalhados dos embarques e desembarques.",
    icone: FileText,
    corIcone: "#c07a12",
    corFundoIcone: "#FBF0DF",
    notaSeDesabilitado: "Em construção",
  },
  {
    titulo: "Gerenciamento de Certificados",
    descricao: "Acompanhe validade, vencimentos e lançamentos de certificados.",
    icone: Award,
    corIcone: "#3d7a3d",
    corFundoIcone: "#E8F5E8",
    notaSeDesabilitado: "Em breve nessa área",
  },
  {
    titulo: "Gerenciamento de Embarques",
    descricao: "Visualize pessoas embarcadas e histórico de embarques.",
    icone: Ship,
    corIcone: "#6a4fb0",
    corFundoIcone: "#EEE9F9",
    href: "/embarques",
  },
];

export default async function PaginaInicial() {
  const jar = await cookies();
  const sessao = await validarCookieSessao(jar.get(NOME_COOKIE_USUARIO)?.value);

  return (
    <main className="max-w-5xl mx-auto px-6 py-14 flex flex-col items-center">
      <Image src="/logo-syncerp.png" alt="Sync ERP" width={64} height={64} className="mb-4" priority />
      <h1 className="text-2xl font-bold text-navy">Sync ERP</h1>
      <p className="text-azul text-sm font-semibold mb-1">MF Máquinas</p>
      <p className="text-gray-500 text-sm mb-10">
        Olá, {sessao?.nome ?? "tudo bem"} — o que você quer fazer?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        {CARTOES.map((c) => (
          <CartaoNavegacao key={c.titulo} cartao={c} />
        ))}
      </div>
    </main>
  );
}

function CartaoNavegacao({ cartao }: { cartao: Cartao }) {
  const Icone = cartao.icone;
  const desabilitado = !cartao.href;

  const conteudo = (
    <div
      className={`h-full bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center gap-3 transition-shadow ${
        desabilitado ? "opacity-60" : "hover:shadow-md cursor-pointer"
      }`}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: cartao.corFundoIcone, color: cartao.corIcone }}
      >
        <Icone size={26} />
      </div>
      <h2 className="font-bold text-navy text-[15px] leading-snug">{cartao.titulo}</h2>
      <p className="text-xs text-gray-500 leading-relaxed flex-1">{cartao.descricao}</p>

      {desabilitado ? (
        <span className="text-[11px] text-gray-400 mt-1">{cartao.notaSeDesabilitado}</span>
      ) : (
        <span className="text-xs font-semibold text-azul mt-1">Acessar →</span>
      )}
    </div>
  );

  if (desabilitado) {
    return <div>{conteudo}</div>;
  }
  return <Link href={cartao.href!}>{conteudo}</Link>;
}
