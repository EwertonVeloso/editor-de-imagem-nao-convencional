# Ateliê — Laboratório Visual de IHC / UX

**Ateliê** é um sistema web interativo desenvolvido como um projeto prático de **Interação Humano-Computador (IHC)** e **Experiência do Usuário (UX)**. 

O objetivo central do sistema é realizar um **teste prático de inferência de funções em uma interface intuitiva** com o tema de um editor de imagens.

---

## 🎯 Objetivo IHC / UX

O usuário deve acessar o sistema **sem receber instruções diretas ou tutoriais explicativos** sobre o que cada controle faz.

Ele deve ser convidado a:
1. **Observar** a composição da interface;
2. **Experimentar** através de cliques, movimentos e arrastes;
3. **Interpretar** o comportamento dos elementos visuais e o feedback dinâmico para deduzir suas funções.

A interface foi projetada para parecer um **laboratório visual / mesa de criação digital**, afastando-se deliberadamente de metáforas tradicionais como as de Photoshop, Canva, Figma ou Photopea.

---

## 🚀 Como Executar

O projeto é **100% autônomo e offline**. Não necessita de servidores, conexão com a internet ou instalação de dependências.

1. Baixe ou clone a pasta do projeto `atelie/`.
2. Abra o arquivo **`index.html`** diretamente no seu navegador de preferência (Chrome, Edge, Firefox, Opera).
3. O sistema carregará instantaneamente a imagem de demonstração local e estará pronto para uso.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5**: Estrutura semântica, elementos de acessibilidade (`aria-label`, papeis de `slider` e `button`) e suporte a Drag & Drop nativo.
* **CSS3**: Variáveis CSS, layout responsivo com Grid e Flexbox, *glassmorphism* (`backdrop-filter: blur`), animações orgânicas de SVG morphing e gradientes dinâmicos.
* **JavaScript (ES6+)**: Manipulação gráfica com a **HTML5 Canvas 2D API**, escutadores de eventos de ponteiro/arraste em tempo real (`PointerEvents`) e leitor de arquivos locais (`FileReader`).
* **SVG**: Gráficos vetoriais locais para controles abstratos e imagem de demonstração.
* **Lucide (CDN opcional)**: Biblioteca de ícones vetoriais usada na lanterna do controle de luminosidade. O sistema permanece funcional mesmo se a biblioteca não carregar.

---

## 🎨 As 6 Funções Abstratas Implementadas

Os 6 controles estão dispostos de forma simétrica e fluida em dois painéis flutuantes (3 no cluster esquerdo e 3 no cluster direito ao lado do canvas central):

| Cluster | # | Função Real | Elemento Visual Abstrato | Como Interagir | Comportamento e Feedback Visual |
|---|---|-------------|--------------------------|----------------|----------------------------------|
| **Esquerdo** | **1** | **Luminosidade** | **Arco de Luz Incompleto** (anel com esfera reluzente e lanterna central) | Alternar níveis de iluminação com cliques ou teclas **Enter/Espaço** | Cada clique percorre níveis predefinidos de claridade (60%, 100%, 150% e 200%). O arco se acende proporcionalmente ao valor atual. |
| **Esquerdo** | **2** | **Cor / Saturação** | **Mancha Cromática Fluida Vetorial** (gota/mancha orgânica animada) | Arrastar verticalmente sobre a mancha, clicar para alternar níveis ou usar setas | Arrastar para cima aumenta a saturação continuamente; para baixo desatura até o preto e branco. Um clique alterna entre níveis (100% → 200% → 0%) e o valor permanece fixo ao soltar. |
| **Esquerdo** | **3** | **Restauração** | **Aviso de Perigo Vermelho** (ícone de restauração) | Clicar | Reseta instantaneamente todas as edições (brilho, cor, rotação, zoom, ponto focal, espelhamento, textos e desenhos) retornando ao estado original. |
| **Direito** | **4** | **Rotação** | **Ícone de Rotação** (imagem local `rotate-icon.jpg`) | Clicar | A cada clique, a imagem gira 90° no sentido horário com animação de rotação no widget. |
| **Direito** | **5** | **Aproximação / Zoom Seletivo** | **Ícone de Aproximação** (imagem local `zoom.jpg`) | Arrastar verticalmente, clicar para alternar níveis de zoom OU clicar/arrastar diretamente na tela | Aumenta/diminui a escala. **Permite escolher o local de zoom**: clicar na imagem foca a aproximação exatamente no ponto desejado com anel de mira neon ciano, e arrastar permite explorar a imagem. |
| **Direito** | **6** | **Espelhamento** | **Ícone de Espelhamento** (imagem local `espelho.jpg`) | Clicar | Inverte a imagem na horizontal. |

---

## 🔍 Zoom Seletivo e Panning na Imagem

* **Seleção do Ponto de Zoom**: Ao clicar em qualquer local da imagem, um anel neon ciano pisca indicando o novo ponto focal. O zoom passará a aproximar diretamente naquela região selecionada!
* **Exploração (Panning)**: Quando a imagem está aproximada (zoom > 1.0x), o usuário pode arrastar diretamente sobre o canvas para navegar livremente por detalhes específicos da foto.

---

## 🧰 Cluster Criativo — Recorte, Texto e Desenho

Na base da tela, um painel horizontal reúne ferramentas complementares que transformam o espaço em uma pequena mesa de criação:

| # | Ferramenta | Elemento Visual | Como Interagir | Comportamento e Feedback Visual |
|---|---|----------------|----------------|----------------------------------|
| 1 | **Recorte** | Ícone de espada (`corte.png`) | Clicar para ativar e arrastar sobre a imagem para delimitar a área; **Enter** confirma e **Esc** cancela | A área fora da seleção escurece com máscara semitransparente e o retângulo ganha borda ciano tracejada; o corte é aplicado definitivamente (destrutivo) à imagem. |
| 2 | **Inserir Texto** | Símbolo Pilcrow (`escrever.png`) | Clicar para ativar e clicar sobre a imagem para criar um texto; **Enter** confirma e **Esc** cancela; clicar num texto já inserido permite editá-lo | Surge um editor de texto inline centralizado com cursor ciano; clicar no botão ativo alterna entre dois tamanhos de fonte (28px e 52px) em vermelho. |
| 3 | **Desenhar** | Ícone de pena (`desenhar.png`) | Clicar para ativar e arrastar sobre a imagem para traçar linhas; clicar no botão ativo alterna a espessura do traço | Traçados livres com ponta arredondada em vermelho, em duas espessuras (8px e 20px). |
| 4 | **Exportar (Download)** | Ícone de download (`download.png`) | Clicar | Baixa a imagem editada em **PNG**; o botão permanece oculto até que haja pelo menos uma edição aplicada. |

> **Dica**: ao ativar uma ferramenta, o cursor da moldura muda conforme o modo ativo (cruz para recorte/desenho, texto para inserção). Pressione **Esc** para desligar a ferramenta atual a qualquer momento.

---

## 🖼️ Carregamento de Imagem Própria

O usuário pode testar com qualquer imagem do seu próprio computador:
* **Duplo clique** na área da moldura central para abrir o seletor de arquivos local;
* **Arrastar e soltar** (`Drag and Drop`) uma imagem diretamente sobre a moldura;
* **Botão no cabeçalho**: um controle com ícone de ponteiro no topo da tela abre o seletor de imagens a qualquer momento.

Ao carregar uma nova imagem, todas as edições anteriores (filtros, rotação, zoom, textos e desenhos) são descartadas e o estado volta ao inicial.

---

## ♿ Acessibilidade e Teclado

Embora a interface não exiba textos para o usuário final, foi implementado suporte completo à acessibilidade:
* Todos os controles possuem atributos **`aria-label`** descritivos (lidos por leitores de tela);
* Suporte a navegação por tecla **`Tab`** com anel de foco destacado em Ciano Neon;
* Controles ajustáveis aceitam teclas de seta (**Setas Esquerda/Direita/Cima/Baixo**) e tecla **Enter / Espaço**.

---

## 📁 Estrutura de Arquivos

```text
atelie/
├── index.html          # Estrutura principal e acessibilidade
├── css/
│   └── style.css       # Sistema visual dark mode, glassmorphism e animações
├── js/
│   └── app.js          # Lógica do Canvas 2D, controles, zoom seletivo e drag&drop
├── assets/
│   ├── demo-artwork.svg      # Ilustração vetorial local de demonstração
│   ├── favicon.svg           # Ícone do navegador
│   ├── pointer-icon.png      # Botão de carregamento no cabeçalho
│   ├── redo.png              # Controle de restauração (reset)
│   ├── rotate-icon.jpg       # Controle de rotação
│   ├── zoom.jpg              # Controle de aproximação
│   ├── espelho.jpg           # Controle de espelhamento
│   ├── corte.png             # Ferramenta de recorte
│   ├── escrever.png          # Ferramenta de inserir texto
│   ├── desenhar.png          # Ferramenta de desenhar
│   └── download.png          # Exportação da imagem editada
└── README.md           # Documentação técnica do projeto
```
