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

### Regras de Design Aplicadas
* ❌ **Sem menus tradicionais** ("Arquivo", "Editar", "Imagem", etc.).
* ❌ **Sem textos explicativos** ("Brilho", "Contraste", "Girar", "Zoom", "Espelhar", "Resetar").
* ❌ **Sem ícones universais** (lixeira, engrenagem, lupa, seta de undo, play/pause, mais/menos, pincel, balde).
* ✅ **Mensagem inicial minimalista**: Apenas uma palavra em tipografia discreta: `"experimente"`.
* ✅ **Affordances abstratas e feedback imediato**: Cada controle fornece resposta visual instantânea tanto na imagem quanto em seu próprio corpo geométrico.

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

---

## 🎨 As 6 Funções Abstratas Implementadas

Os 6 controles estão dispostos de forma simétrica e fluida em dois painéis flutuantes (3 no cluster esquerdo e 3 no cluster direito ao lado do canvas central):

| Cluster | # | Função Real | Elemento Visual Abstrato | Como Interagir | Comportamento e Feedback Visual |
|---|---|-------------|--------------------------|----------------|----------------------------------|
| **Esquerdo** | **1** | **Luminosidade** | **Arco de Luz Incompleto** (anel com esfera reluzente) | Arrastar a esfera ao longo do arco ou usar setas do teclado | Movimentar para um lado clareia a imagem; para o outro, escurece. O próprio arco ilumina-se proporcionalmente. |
| **Esquerdo** | **2** | **Cor / Saturação** | **Mancha Cromática Fluida Vetorial** (gota/mancha orgânica animada) | Arrastar verticalmente sobre a mancha ou usar setas | Arrastar para cima aumenta a saturação continuamente; para baixo desatura até o preto e branco. O valor permanece fixo ao soltar. |
| **Esquerdo** | **3** | **Restauração** | **Núcleo Fragmentado** (quatro peças quadradas separadas) | Clicar | Reseta instantaneamente todas as edições (brilho, cor, rotação, zoom, ponto focal e espelhamento) retornando ao estado original. |
| **Direito** | **4** | **Rotação** | **Peça Geométrica Assimétrica** (anel com peso angular) | Clicar | A cada clique, a imagem gira 90° no sentido horário com animação gráfica de rotação no widget. |
| **Direito** | **5** | **Aproximação / Zoom Seletivo** | **Anéis Concêntricos Expansivos** (estrutura de radar) | Arrastar/clicar nos anéis OU clicar/arrastar diretamente na tela | Aumenta/diminui a escala. **Permite escolher o local de zoom**: clicar na imagem foca a aproximação exatamente no ponto desejado com anel de mira neon ciano, e arrastar permite explorar a imagem. |
| **Direito** | **6** | **Espelhamento** | **Metades Simétricas Refletidas** (duas formas prismáticas) | Clicar | Inverte a imagem na horizontal. As duas metades do controle alternam suas cores de destaque. |

---

## 🔍 Zoom Seletivo e Panning na Imagem

* **Seleção do Ponto de Zoom**: Ao clicar em qualquer local da imagem, um anel neon ciano pisca indicando o novo ponto focal. O zoom passará a aproximar diretamente naquela região selecionada!
* **Exploração (Panning)**: Quando a imagem está aproximada (zoom > 1.0x), o usuário pode arrastar diretamente sobre o canvas para navegar livremente por detalhes específicos da foto.

---

## 🖼️ Carregamento de Imagem Própria

O usuário pode testar com qualquer imagem do seu próprio computador:
* **Duplo clique** na área da moldura central para abrir o seletor de arquivos local;
* **Arrastar e soltar** (`Drag and Drop`) uma imagem diretamente sobre a moldura.

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
│   ├── demo-artwork.svg # Ilustração vetorial local de demonstração
│   └── favicon.svg     # Ícone do navegador
└── README.md           # Documentação técnica do projeto
```
