const Ticker$1 = (tickerContainer) => {
  const classes = window.themeCore.utils.cssClasses;
  const throttle = window.themeCore.utils.throttle;
  const selectors2 = {
    tickerContentContainer: ".js-ticker-content-container"
  };
  let tickerContentContainer;
  let tickerItemsInitial;
  function init() {
    if (!tickerContainer) {
      return;
    }
    tickerContentContainer = tickerContainer.querySelector(selectors2.tickerContentContainer);
    if (!tickerContentContainer) {
      return;
    }
    tickerItemsInitial = [...tickerContentContainer.children].filter((child) => !child.classList.contains(classes.clone));
    if (!tickerItemsInitial.length) {
      return;
    }
    setTickerContent();
    setEventListeners();
    setTickerLoaded();
  }
  function setTickerLoaded() {
    tickerContainer.classList.remove(classes.loading);
  }
  function setTickerContent() {
    const tickerContainerWidth = tickerContainer.offsetWidth;
    let tickerItemsInitialWidth = 0;
    let clonesCount = 1;
    let itemsCount = 1;
    tickerItemsInitial = [...tickerContentContainer.children].filter((child) => !child.classList.contains(classes.clone));
    tickerItemsInitial.forEach((tickerItemInitial) => {
      tickerItemsInitialWidth += tickerItemInitial.offsetWidth;
    });
    if (tickerItemsInitialWidth && tickerItemsInitialWidth > 0 && tickerItemsInitialWidth < tickerContainerWidth) {
      clonesCount = 2 * Math.ceil(tickerContainerWidth / tickerItemsInitialWidth) - 1;
    }
    itemsCount += clonesCount;
    tickerContentContainer.innerHTML = "";
    for (let i = 0; i < itemsCount; i++) {
      tickerItemsInitial.forEach((tickerItemInitial) => {
        let cloneTickerItemInitial = tickerItemInitial.cloneNode(true);
        if (i > 0) {
          cloneTickerItemInitial.classList.add(classes.clone);
        }
        tickerContentContainer.appendChild(cloneTickerItemInitial);
      });
    }
  }
  function addResizeListener(element, callback) {
    if (!element || typeof callback !== "function")
      return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        callback(entry.target);
      }
    });
    resizeObserver.observe(element);
  }
  function setEventListeners() {
    addResizeListener(tickerContainer, throttle(setTickerContent, 200));
  }
  return Object.freeze({
    init
  });
};
const selectors = {
  section: ".js-ticker-container"
};
const Ticker = () => {
  function init(sectionId) {
    const sections = [...document.querySelectorAll(selectors.section)].filter((section) => !sectionId || section.closest(`#shopify-section-${sectionId}`));
    sections.forEach((section) => Ticker$1(section).init());
  }
  return Object.freeze({
    init
  });
};
const action = () => {
  window.themeCore.Ticker = window.themeCore.Ticker || Ticker();
  window.themeCore.utils.register(window.themeCore.Ticker, "ticker");
};
if (window.themeCore && window.themeCore.loaded) {
  action();
} else {
  document.addEventListener("theme:all:loaded", action, { once: true });
}
