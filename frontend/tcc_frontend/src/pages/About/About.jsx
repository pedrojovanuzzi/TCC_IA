"use client";

import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import img from "../../assets/imgs/about1.jpg";
import img2 from "../../assets/imgs/about2.jpg";
import img3 from "../../assets/imgs/about3.jpg";
import img4 from "../../assets/imgs/about4.jpg";
import img5 from "../../assets/imgs/about5.jpg";
import confusionMatrix from "../../assets/imgs/about_graphs/confusion_matrix_normalized.png";
import f1Curve from "../../assets/imgs/about_graphs/F1_curve.png";
import labels from "../../assets/imgs/about_graphs/labels.jpg";
import results from "../../assets/imgs/about_graphs/results.png";

const timeline = [
  {
    name: "Ideia Criada",
    description: "A ideia é criada e apresentada para o orientador do TCC",
    date: "Fev 2025",
    dateTime: "2025-02",
  },
  {
    name: "Treinamento",
    description:
      "Começa o treinamento do modelo e das gerações automatizadas de imagens para treinamento",
    date: "Mar 2025",
    dateTime: "2021-12",
  },
  {
    name: "Teste",
    description:
      "Precisão se torna alta suficiente para poder ser considerado correto, fase de testes com objetos de varias cores e tamanhos começam",
    date: "Jun 2025",
    dateTime: "2025-06",
  },
  {
    name: "Conclusão",
    description: "Finalização do projeto e da documentação do TCC",
    date: "Nov 2025",
    dateTime: "2025-12",
  },
];

export default function About() {
  return (
    <div className="bg-white">
      <main className="isolate">
        <Header />
        {/* Hero section */}
        <div className="relative isolate -z-10 overflow-hidden bg-gradient-to-b from-indigo-100/20 pt-14">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-1/2 -z-10 -mr-96 w-[200%] origin-top-right skew-x-[-30deg] bg-white shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-50 sm:-mr-80 lg:-mr-96"
          />
          <div className="mx-auto max-w-7xl px-6 py-32 sm:py-40 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:grid lg:max-w-none lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8 xl:grid-cols-1 xl:grid-rows-1 xl:gap-x-8">
              {/* <h1 class="max-w-2xl text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl lg:col-span-2 xl:col-auto">We’re changing the way people connect</h1> */}
              <h1 className="max-w-2xl text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl lg:col-span-2 xl:col-auto">
                Fases de Treinamento e Trajetoria
              </h1>
              <div className="mt-6 max-w-xl lg:mt-0 xl:col-end-1 xl:row-start-1">
                <p className="text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
                  Como chegamos ao modelo e de que maneira treinamos e
                  organizamos nossas estrategias
                </p>
              </div>
              <img
                alt=""
                src={img}
                className="mt-10 aspect-[6/5] w-full max-w-lg rounded-2xl object-cover sm:mt-16 lg:mt-0 lg:max-w-none xl:row-span-2 xl:row-end-2 xl:mt-36"
              />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white sm:h-32" />
        </div>

        {/* Timeline section */}
        <div className="mx-auto -mt-8 max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 overflow-hidden lg:mx-0 lg:max-w-none lg:grid-cols-4">
            {timeline.map((item) => (
              <div key={item.name}>
                <time
                  dateTime={item.dateTime}
                  className="flex items-center text-sm/6 font-semibold text-indigo-600"
                >
                  <svg
                    viewBox="0 0 4 4"
                    aria-hidden="true"
                    className="mr-4 size-1 flex-none"
                  >
                    <circle r={2} cx={2} cy={2} fill="currentColor" />
                  </svg>
                  {item.date}
                  <div
                    aria-hidden="true"
                    className="absolute -ml-2 h-px w-screen -translate-x-full bg-gray-900/10 sm:-ml-4 lg:static lg:-mr-6 lg:ml-8 lg:w-auto lg:flex-auto lg:translate-x-0"
                  />
                </time>
                <p className="mt-6 text-lg/8 font-semibold tracking-tight text-gray-900">
                  {item.name}
                </p>
                <p className="mt-1 text-base/7 text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content section */}
        <div className="mt-32 overflow-hidden sm:mt-40">
          <div className="mx-auto max-w-7xl px-6 lg:flex lg:px-8">
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:mx-0 lg:min-w-full lg:max-w-none lg:flex-none lg:gap-y-8">
              <div className="lg:col-end-1 lg:w-full lg:max-w-lg lg:pb-8">
                <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                  Detecção
                </h2>
                <p className="mt-6 text-xl/8 text-gray-600">
                  Nosso modelo é capaz de distinguir, o humano do objeto, se por
                  exemplo, um colaborador retirar seu capacete, uma caixa
                  azul escuro irá aparecer detectando a ausencia dele, isso também
                  serve para luvas, sapatos, oculos e talabarte
                </p>
              </div>
              <div className="flex flex-wrap items-start justify-end gap-6 sm:gap-8 lg:contents">
                <div className="w-0 flex-auto lg:ml-auto lg:w-auto lg:flex-none lg:self-end">
                  <img
                    alt=""
                    src={img5}
                    className="aspect-[7/5] w-[37rem] max-w-none rounded-2xl bg-gray-50 object-cover"
                  />
                </div>
                <div className="contents lg:col-span-2 lg:col-end-2 lg:ml-auto lg:flex lg:w-[37rem] lg:items-start lg:justify-end lg:gap-x-8">
                  <div className="order-first flex w-64 flex-none justify-end self-end lg:w-auto">
                    <img
                      alt=""
                      src={img4}
                      className="aspect-[4/3] w-[24rem] max-w-none flex-none rounded-2xl bg-gray-50 object-cover"
                    />
                  </div>
                  <div className="flex w-96 flex-auto justify-end lg:w-auto lg:flex-none">
                    <img
                      alt=""
                      src={img3}
                      className="aspect-[7/5] w-[37rem] max-w-none flex-none rounded-2xl bg-gray-50 object-cover"
                    />
                  </div>
                  <div className="hidden sm:block sm:w-0 sm:flex-auto lg:w-auto lg:flex-none">
                    <img
                      alt=""
                      src={img2}
                      className="aspect-[4/3] w-[24rem] max-w-none rounded-2xl bg-gray-50 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo cloud */}
        <div className="mx-auto mt-32 max-w-7xl sm:mt-40 sm:px-6 lg:px-8">
          {/* 📊 Métricas de Precisão YOLO */}
          <div className="mx-auto mt-32 max-w-7xl sm:mt-40 sm:px-6 lg:px-8">
            <div className="relative isolate overflow-hidden bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Métricas de Precisão do Modelo YOLO
              </h2>
              <p className="mt-6 text-lg text-white/90">
                As imagens abaixo representam as principais métricas utilizadas
                para avaliar o desempenho do modelo YOLO treinado.
              </p>
            </div>

            {/* 🧠 Explicações e imagens */}
            <div className="mt-12 space-y-16 text-gray-800">
              {/* Confusion Matrix */}
              <section>
                <h3 className="text-2xl font-semibold text-cyan-600 mb-3">
                  ℹ️ Introdução
                </h3>
                <p className="text-lg mb-6 text-gray-700">
                O modelo foi treinado utilizando um dataset de 9 mil imagens, a biblioteca YOLO utilizada gera graficos automaticamente com base no dataset e na precisão, com esses gráficos podemos nos guiar e tomar decisoes para melhorar o modelo na aprendizagem.
                </p>
                <h3 className="text-2xl font-semibold text-cyan-600 mb-3">
                  📉 Matriz de Confusão Normalizada
                </h3>
                <p className="text-lg mb-6 text-gray-700">
                  A matriz de confusão mostra o desempenho do modelo em cada
                  classe. Os valores na diagonal principal representam acertos —
                  por exemplo, o YOLO identificou corretamente capacetes (
                  <b>helmet</b>) em 95% dos casos. Já os valores fora da
                  diagonal representam confusões, ou seja, quando uma classe foi
                  prevista incorretamente como outra.
                </p>
                <img
                  src={confusionMatrix}
                  alt="Matriz de Confusão YOLO"
                  className="rounded-2xl shadow-lg w-full"
                />
              </section>

              {/* F1-Confidence Curve */}
              <section>
                <h3 className="text-2xl font-semibold text-cyan-600 mb-3">
                  📈 Curva F1-Confidence
                </h3>
                <p className="text-lg mb-6 text-gray-700">
                  A curva F1 mede o equilíbrio entre precisão e recall
                  (sensibilidade). O ponto mais alto indica o melhor limiar de
                  confiança — neste caso, o modelo alcançou <b>F1 = 0.82</b> com
                  confiança de <b>0.47</b>. Isso mostra que o YOLO consegue
                  manter alta precisão mesmo com variações na confiança da
                  detecção.
                </p>
                <img
                  src={f1Curve}
                  alt="Curva F1 YOLO"
                  className="rounded-2xl shadow-lg w-full"
                />
              </section>

              {/* Labels Distribution */}
              <section>
                <h3 className="text-2xl font-semibold text-cyan-600 mb-3">
                  🔍 Distribuição e Posições dos Rótulos
                </h3>
                <p className="text-lg mb-6 text-gray-700">
                  O gráfico apresenta a distribuição das classes no dataset de
                  treinamento. É possível observar quais EPIs aparecem com maior
                  frequência — como <b>hands</b> e <b>helmet</b> — além da
                  distribuição espacial (posição dos objetos e tamanhos nas
                  imagens).
                </p>
                <img
                  src={labels}
                  alt="Distribuição de Labels YOLO"
                  className="rounded-2xl shadow-lg w-full"
                />
              </section>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
