import { useNavigate } from "react-router-dom"; // Hook do React Router para navegação programática (não está sendo usado)
import webcam from "../../assets/imgs/webcam.png"; // Imagem do card "Web Cam"
import catraca from "../../assets/imgs/catraca.png"; // Imagem do card "Catraca"
import galeria from "../../assets/imgs/galeria.png"; // Imagem do card "Fotos"
import video from "../../assets/imgs/video_player.png"; // Imagem do card "Video"
import precision from "../../assets/imgs/precision-marketing.png"; // Imagem do card "Monitoramento"
import Header from "../../components/Header"; // Componente de cabeçalho
import { Link } from "react-router-dom"; // Componente de link para navegação declarativa

export default function Options() { // Página de opções (cards de navegação)
  const navigate = useNavigate(); // Instância do hook; atualmente não é utilizada

  return (
    <>
      {/* Container da página: altura total e fundo cinza claro */}
      <div className="h-screen bg-gray-50">
        {/* Cabeçalho global do app */}
        <Header />

        {/* Seção principal com espaçamento vertical */}
        <div className="bg-gray-50 py-5">
          {/* Wrapper centralizado e responsivo com larguras máximas em breakpoints */}
          <div className="mx-auto max-w-3xl px-6 lg:max-w-7xl lg:px-8">
            {/* Subtítulo/label do módulo */}
            <h2 className="text-center text-base/7 font-semibold text-indigo-600">
              YOLO
            </h2>

            {/* Título principal da página de opções */}
            <p className="mx-auto mt-2 max-w-lg text-balance text-center text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              Escolha qual modo usar
            </p>

            {/* Grade de cards: empilha em coluna no mobile, vira grid em telas maiores.
                Em lg: 5 colunas por 2 linhas, com alguns cards ocupando 2 linhas */}
            <div className="mt-10 flex flex-col sm:grid gap-2 sm:mt-10 lg:grid-cols-5 lg:grid-rows-2">
              {/* Card 1: Web Cam em tempo real (ocupa 2 linhas no lg) */}
              <div className="relative lg:row-span-2">
                {/* Fundo/borda interna do card */}
                <div className="absolute inset-px  bg-white "></div>

                {/* Conteúdo do card: coluna, ocupa altura total */}
                <div className="relative flex h-full flex-col overflow-hidden  ">
                  {/* Título e descrição do card */}
                  <div className="px-8 pb-3 pt-8 sm:px-10 sm:pb-0 sm:pt-10">
                    <p className="mt-2 text-lg font-medium tracking-tight text-gray-950 max-lg:text-center">
                      Web Cam em tempo real
                    </p>
                    <p className="mt-2 max-w-lg text-sm/6 text-gray-600 max-lg:text-center">
                      Utilize sua webcam para acessar e fazer a inferência ao vivo
                    </p>
                  </div>

                  {/* Ação: navega para a rota /cam */}
                  <Link
                    to="/cam"
                    className="mt-5 px-20 py-5 sm:w-1/2 self-center cursor-pointer bg-indigo-500 sm:px-3 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-center rounded"
                  >
                    Abrir
                  </Link>

                  {/* Imagem ilustrativa do card */}
                  <div className="flex flex-1 items-center justify-center px-8 max-lg:pb-12 max-lg:pt-10 mt-4 sm:px-10 lg:pb-2">
                    <img
                      className="w-32 sm:w-44 lg:w-full max-lg:max-w-xs"
                      src={webcam}
                      alt="" /* Dica: adicionar texto alternativo descritivo para acessibilidade */
                    />
                  </div>
                </div>

                {/* Sombra/anel de borda decorativa, sem interação de mouse */}
                <div className="pointer-events-none absolute inset-px  shadow ring-1 ring-black/5 "></div>
              </div>

              {/* Card 2: Catraca (ocupa 2 linhas no lg) */}
              <div className="relative lg:row-span-2">
                {/* Fundo/borda interna do card */}
                <div className="absolute inset-px  bg-white "></div>

                {/* Conteúdo do card */}
                <div className="relative flex h-full flex-col overflow-hidden  ">
                  <div className="px-8 pb-3 pt-8 sm:px-10 sm:pb-0 sm:pt-10">
                    <p className="mt-2 text-lg font-medium tracking-tight text-gray-950 max-lg:text-center">
                      Catraca
                    </p>
                    <p className="mt-2 max-w-lg text-sm/6 text-gray-600 max-lg:text-center">
                      Simula uma câmera acoplada a um sistema de catraca com
                      passagem de cracha
                    </p>
                  </div>

                  {/* Ação: navega para a rota /catraca */}
                  <Link
                    to="/catraca"
                    className="mt-5 px-20 py-5 sm:w-1/2 self-center cursor-pointer bg-indigo-500 sm:px-3 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-center rounded"
                  >
                    Abrir
                  </Link>

                  {/* Imagem ilustrativa do card */}
                  <div className="flex flex-1 items-center justify-center px-8 max-lg:pb-12 max-lg:pt-10 mt-4 sm:px-10 lg:pb-2">
                    <img
                      className="w-32 sm:w-44 lg:w-full max-lg:max-w-xs"
                      src={catraca}
                      alt="" /* Dica: adicionar texto alternativo descritivo */
                    />
                  </div>
                </div>

                {/* Sombra/anel de borda decorativa */}
                <div className="pointer-events-none absolute inset-px  shadow ring-1 ring-black/5 "></div>
              </div>

              {/* Card 3: Fotos (ocupa 2 linhas; começa na primeira linha em telas menores) */}
              <div className="relative max-lg:row-start-1 row-span-2">
                {/* Fundo/borda interna do card */}
                <div className="absolute inset-px  bg-white "></div>

                {/* Conteúdo do card */}
                <div className="relative flex h-full flex-col overflow-hidden  ">
                  <div className="px-8 pt-8 sm:px-10 sm:pt-10">
                    <p className="mt-2 text-lg font-medium tracking-tight text-gray-950 max-lg:text-center">
                      Fotos
                    </p>
                    <p className="mt-2 max-w-lg text-sm/6 text-gray-600 max-lg:text-center">
                      Coloque uma foto e deixe o aplicativo rastrear os objetos
                      para você
                    </p>
                  </div>

                  {/* Ação: navega para a rota /foto */}
                  <Link
                    to="/foto"
                    className="mt-5 px-20 py-5 sm:w-1/2 self-center cursor-pointer bg-indigo-500 sm:px-3 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-center rounded"
                  >
                    Abrir
                  </Link>

                  {/* Imagem ilustrativa do card */}
                  <div className="flex flex-1 items-center justify-center px-8 max-lg:pb-12 max-lg:pt-10 mt-4 sm:px-10 lg:pb-2">
                    <img
                      className="w-32 sm:w-44 lg:w-full max-lg:max-w-xs"
                      src={galeria}
                      alt="" /* Dica: adicionar texto alternativo descritivo */
                    />
                  </div>
                </div>

                {/* Sombra/anel de borda decorativa */}
                <div className="pointer-events-none absolute inset-px  shadow ring-1 ring-black/5 "></div>
              </div>

              {/* Card 4: Video (ocupa 2 linhas no lg) */}
              <div className="relative lg:row-span-2">
                {/* Fundo/borda interna do card */}
                <div className="absolute inset-px  bg-white  "></div>

                {/* Conteúdo do card */}
                <div className="relative flex h-full flex-col overflow-hidden">
                  <div className="px-8 pb-3 pt-8 sm:px-10 sm:pb-0 sm:pt-10">
                    <p className="mt-2 text-lg font-medium tracking-tight text-gray-950 max-lg:text-center">
                      Video
                    </p>
                    <p className="mt-2 max-w-lg text-sm/6 text-gray-600 max-lg:text-center">
                      Arraste um arquivo de video e iremos processa-lo
                    </p>
                  </div>

                  {/* Ação: navega para a rota /video */}
                  <Link
                    to="/video"
                    className="mt-5 px-20 py-5 sm:w-1/2 self-center cursor-pointer bg-indigo-500 sm:px-3 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-center rounded"
                  >
                    Abrir
                  </Link>

                  {/* Imagem ilustrativa do card */}
                  <div className="flex flex-1 items-center justify-center px-8 max-lg:pb-12 max-lg:pt-10 mt-4 sm:px-10 lg:pb-2">
                    <img
                      className="w-32 sm:w-44 lg:w-full max-lg:max-w-xs"
                      src={video}
                      alt="" /* Dica: adicionar texto alternativo descritivo */
                    />
                  </div>
                </div>

                {/* Sombra/anel de borda decorativa */}
                <div className="pointer-events-none absolute inset-px  shadow ring-1 ring-black/5  "></div>
              </div>

              {/* Card 5: Monitoramento (ocupa 2 linhas; começa na primeira linha em telas menores) */}
              <div className="relative max-lg:row-start-1 row-span-2">
                {/* Fundo/borda interna do card */}
                <div className="absolute inset-px  bg-white "></div>

                {/* Conteúdo do card */}
                <div className="relative flex h-full flex-col overflow-hidden  ">
                  <div className="px-8 pt-8 sm:px-10 sm:pt-10">
                    <p className="mt-2 text-lg font-medium tracking-tight text-gray-950 max-lg:text-center">
                      Monitoramento
                    </p>
                    <p className="mt-2 max-w-lg text-sm/6 text-gray-600 max-lg:text-center">
                      Vizualize, Adicione, Modifique ou Remova Câmeras de
                      Monitoramento
                    </p>
                  </div>

                  {/* Ação: navega para a rota /monitoring */}
                  <Link
                    to="/monitoring"
                    className="mt-5 px-20 py-5 sm:w-1/2 self-center cursor-pointer bg-indigo-500 sm:px-3 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-center rounded"
                  >
                    Abrir
                  </Link>

                  {/* Imagem ilustrativa do card */}
                  <div className="flex flex-1 items-center justify-center px-8 max-lg:pb-12 max-lg:pt-10 mt-4 sm:px-10 lg:pb-2">
                    <img
                      className="w-32 sm:w-44 lg:w-full max-lg:max-w-xs"
                      src={precision}
                      alt="" /* Dica: adicionar texto alternativo descritivo */
                    />
                  </div>
                </div>

                {/* Sombra/anel de borda decorativa */}
                <div className="pointer-events-none absolute inset-px  shadow ring-1 ring-black/5 "></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
