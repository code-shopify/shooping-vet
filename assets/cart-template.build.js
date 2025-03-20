const Cart = () => {
  const Toggle = window.themeCore.utils.Toggle;
  const cssClasses = window.themeCore.utils.cssClasses;
  const formToJSON = window.themeCore.utils.formToJSON;
  const on = window.themeCore.utils.on;
  const QuantityWidget = window.themeCore.utils.QuantityWidget;
  const CartUpsell = window.themeCore.utils.CartUpsell;
  const Preloder = window.themeCore.utils.Preloder;
  const selectors = {
    section: '[data-section-type="cart-template"]',
    sectionDrawer: '[data-section-modification="drawer"]',
    upsellDrawer: "#CartUpsellDrawer",
    subtotal: ".js-cart-subtotal",
    container: ".js-cart-container",
    content: ".js-cart-content",
    termsAndConditionsCheckbox: ".js-terms-and-conditions-checkbox",
    buttonsContent: ".js-cart-footer-button",
    cartButton: ".js-cart-button",
    additionalButtons: ".js-cart-footer-additional-buttons",
    cartItem: "[data-cart-item]",
    quantity: ".js-quantity",
    quantityError: ".js-cart-item-error-message",
    remove: ".js-cart-item-remove",
    closeButton: ".js-cart-close-button",
    cartNoteField: ".js-cart-notes-field",
    cartDrawerNoteControlText: ".js-cart-note-control-text",
    cartFooterButtonMessage: ".js-cart-footer-button-message",
    submit: '[type="submit"]',
    scrollable: "[data-scrollable]",
    upsellMobileTrigger: ".js-cart-upsell-trigger",
    cartEmptySlider: ".js-cart-empty-slider",
    cartEmptyButtonPrev: ".js-cart-empty-button-prev",
    cartEmptyButtonNext: ".js-cart-empty-button-next"
  };
  const classes = {
    ...cssClasses,
    empty: "is-empty"
  };
  const attributes = {
    disableButton: "data-disable-button"
  };
  let sections = [];
  let drawers = [];
  function init() {
    setupSliders();
    setupTermsAndConditions();
    setupDrawers();
    setupSections();
    setupEventListeners();
    if (window.themeCore.objects.settings.show_shipping_rates_calculator && window.Shopify) {
      initCartShippingCalculator();
    }
  }
  let hasErrors = false;
  function setupSliders() {
    const Swiper = window.themeCore.utils.Swiper;
    const cartEmptySlider = document.querySelector(selectors.cartEmptySlider);
    if (cartEmptySlider) {
      new Swiper(cartEmptySlider, {
        slidesPerView: 2,
        spaceBetween: 16,
        navigation: {
          nextEl: selectors.cartEmptyButtonNext,
          prevEl: selectors.cartEmptyButtonPrev
        },
        breakpoints: {
          768: {
            slidesPerView: 1.85
          }
        }
      });
    }
  }
  function setupTermsAndConditions() {
    const termsAndConditionsCheckbox = document.querySelector(selectors.termsAndConditionsCheckbox);
    const cartButton = document.querySelector(selectors.cartButton);
    function handlerDisable() {
      if (cartButton.hasAttribute(attributes.disableButton)) {
        cartButton.disabled = !termsAndConditionsCheckbox.checked;
      }
    }
    if (termsAndConditionsCheckbox) {
      handlerDisable();
      termsAndConditionsCheckbox.addEventListener("change", () => {
        handlerDisable();
      });
    }
  }
  function setupDrawers() {
    drawers = [...document.querySelectorAll(selectors.sectionDrawer)].map((section) => {
      const drawer = Toggle({
        toggleSelector: section.id,
        closeAccordionsOnHide: false
      });
      drawer.init();
      const initializedDrawer = {
        el: section,
        toggle: {
          open: () => drawer.open(section),
          close: () => drawer.close(section)
        }
      };
      setupDrawerEvents(initializedDrawer);
      return initializedDrawer;
    });
  }
  function setupDrawerEvents(drawer) {
    if (!drawer || !drawer.toggle) {
      return;
    }
    window.themeCore.EventBus.listen(`cart:drawer:${drawer.el.id}:open`, drawer.toggle.open);
    window.themeCore.EventBus.listen(`cart:drawer:${drawer.el.id}:close`, drawer.toggle.close);
  }
  function setupSections() {
    sections = Array.from(document.querySelectorAll(selectors.section)).map((section) => ({
      el: section,
      id: section.dataset.sectionId,
      content: section.querySelector(selectors.content)
    }));
    sections.forEach((section) => {
      const quantityWidgets = Array.from(section.el.querySelectorAll(selectors.quantity));
      if (!quantityWidgets || !quantityWidgets.length) {
        section.quantityWidgets = [];
      } else {
        section.quantityWidgets = quantityWidgets.map((quantityEl) => {
          const widget = QuantityWidget(quantityEl, {
            onQuantityChange
          });
          return widget.init();
        });
      }
      const preloader = Preloder(section.el);
      if (preloader) {
        section.preloader = preloader.init();
      }
      section.upsell = {};
      const upsellDrawer = section.el.querySelector(selectors.upsellDrawer);
      const upsell = CartUpsell(upsellDrawer, {
        onFormSubmit: onUpsellFormSubmit
      });
      if (upsell && upsellDrawer) {
        section.upsell = upsell.init();
        const upsellToggleEl = section.el.querySelector(selectors.upsellMobileTrigger);
        upsellToggleEl && upsellToggleEl.replaceWith(upsellToggleEl.cloneNode(true));
        section.upsell.drawer = Toggle({
          toggleSelector: section.upsell.container.id,
          closeAccordionsOnHide: false,
          overlay: false
        });
        section.upsell.drawer.init();
        const upsellPreloader = Preloder(section.upsell.container);
        if (upsellPreloader) {
          section.upsell.preloader = upsellPreloader.init();
        }
        window.themeCore.EventBus.listen(`Toggle:${section.el.id}:close`, function() {
          section.upsell.drawer.close(section.upsell.container);
        });
      }
      on("click", section.el, onRemoveButtonClick);
    });
    updateFreeShippingBar();
    window.themeCore.LazyLoadImages.init();
  }
  function setupEventListeners() {
    window.themeCore.EventBus.listen("cart:updated", onCartUpdated);
    window.themeCore.EventBus.listen("cart:refresh", refreshSections);
    window.themeCore.EventBus.listen("cart:drawer:open", openCartDrawer);
    window.themeCore.EventBus.listen("cart:drawer:refresh-and-open", refreshAndOpenCartDrawer);
    window.themeCore.EventBus.listen("cart:drawer:close", closeCartDrawer);
    document.addEventListener("click", (event) => event.target.closest(selectors.closeButton) && window.themeCore.EventBus.emit("cart:drawer:close"));
    document.addEventListener("change", saveCartNoteValue);
  }
  async function saveCartNoteValue(event) {
    const cartNotesField = event.target.closest(selectors.cartNoteField);
    const cartNoteControlText = document.querySelector(selectors.cartDrawerNoteControlText);
    if (!cartNotesField)
      return;
    showPreloaders();
    try {
      await window.themeCore.CartApi.makeRequest(window.themeCore.CartApi.actions.UPDATE_CART, {
        note: cartNotesField.value
      });
    } catch (error) {
      console.log(error);
    } finally {
      hidePreloaders();
      if (cartNoteControlText) {
        if (cartNotesField.value !== "") {
          cartNoteControlText.textContent = window.themeCore.translations.get("cart.general.edit_note");
        } else {
          cartNoteControlText.textContent = window.themeCore.translations.get("cart.general.note");
        }
      }
    }
  }
  function getSectionsIds() {
    return sections.map((section) => section.id);
  }
  function getCartSectionsDOMs() {
    const ids = getSectionsIds();
    const requestURL = new URL(window.location.href);
    requestURL.searchParams.set("sections", ids.join(","));
    requestURL.searchParams.set("lazyload", "false");
    return fetch(requestURL.href).then((response) => response.json());
  }
  function openCartDrawer(data) {
    if (data && data.id) {
      window.themeCore.EventBus.emit(`cart:drawer:${data.id}:open`);
      return;
    }
    const firstAvailableCartDrawer = drawers.find((drawer) => drawer.toggle && drawer.toggle.open);
    if (firstAvailableCartDrawer) {
      firstAvailableCartDrawer.toggle.open();
    }
  }
  function refreshAndOpenCartDrawer(data) {
    refreshSections().then(() => {
      openCartDrawer(data);
    });
  }
  function closeCartDrawer(data) {
    if (data && data.id) {
      window.themeCore.EventBus.emit(`cart:drawer:${data.id}:close`);
      return;
    }
    drawers.forEach((drawer) => {
      if (drawer.toggle && drawer.toggle.close) {
        drawer.toggle.close();
      }
    });
  }
  function showPreloaders() {
    sections.forEach((section) => {
      if (section.preloader) {
        section.preloader.show();
      }
      if (section.upsell && section.upsell.preloader) {
        section.upsell.preloader.show();
      }
    });
  }
  function hidePreloaders() {
    sections.forEach((section) => {
      if (section.preloader) {
        section.preloader.hide();
      }
      if (section.upsell && section.upsell.preloader) {
        section.upsell.preloader.hide();
      }
    });
  }
  async function refreshSections(sectionsResource = null) {
    const resource = !(sectionsResource && Object.keys(sectionsResource).length === 0 && Object.getPrototypeOf(sectionsResource) === Object.prototype) ? sectionsResource : await getCartSectionsDOMs();
    if (!resource) {
      return false;
    }
    sections.map((section) => {
      const template = new DOMParser().parseFromString(resource[section.id], "text/html");
      const updatedSection = template.querySelector(selectors.section);
      const content = template.querySelector(selectors.content);
      const subtotalContent = template.querySelector(selectors.subtotal);
      const buttonsContent = template.querySelector(selectors.buttonsContent);
      const additionalButtons = template.querySelector(selectors.additionalButtons);
      const cartFooterButtonMessage = template.querySelector(selectors.cartFooterButtonMessage);
      const upsellDrawer = template.querySelector(selectors.upsellDrawer);
      if (!updatedSection || !content) {
        return;
      }
      section.el.classList.toggle(classes.empty, updatedSection.classList.contains(classes.empty));
      const sectionContent = section.el.querySelector(selectors.content);
      if (!sectionContent) {
        return;
      }
      if (buttonsContent) {
        const sectionButtonsContent = section.el.querySelector(selectors.buttonsContent);
        if (sectionButtonsContent && sectionButtonsContent.innerHTML !== buttonsContent.innerHTML) {
          sectionButtonsContent.innerHTML = buttonsContent.innerHTML;
        }
      }
      if (cartFooterButtonMessage) {
        const sectionCartFooterButtonMessage = section.el.querySelector(selectors.cartFooterButtonMessage);
        if (sectionCartFooterButtonMessage && sectionCartFooterButtonMessage.outerHTML !== cartFooterButtonMessage.outerHTML) {
          sectionCartFooterButtonMessage.outerHTML = cartFooterButtonMessage.outerHTML;
        }
      }
      if (additionalButtons) {
        const sectionAdditionalButtons = section.el.querySelector(selectors.additionalButtons);
        if (sectionAdditionalButtons && sectionAdditionalButtons.innerHTML !== additionalButtons.innerHTML) {
          sectionAdditionalButtons.classList.toggle(classes.hidden, additionalButtons.classList.contains(classes.hidden));
        }
      }
      if (subtotalContent) {
        const sectionSubtotal = section.el.querySelector(selectors.subtotal);
        if (sectionSubtotal) {
          sectionSubtotal.innerHTML = subtotalContent.innerHTML;
        }
      }
      const upsellToggleEl = section.el.querySelector(selectors.upsellMobileTrigger);
      upsellToggleEl && upsellToggleEl.classList.toggle(classes.hidden, !upsellDrawer);
      if (!upsellDrawer && section.upsell.container) {
        section.upsell.container.outerHTML = "";
        section.upsell.container.remove();
      } else if (upsellDrawer) {
        if (section.upsell.container) {
          const scrollable = section.upsell.container.querySelector(selectors.scrollable);
          const scrollTopPosition = scrollable ? scrollable.scrollTop : 0;
          const updatedUpsell = section.upsell.refresh(upsellDrawer);
          if (updatedUpsell) {
            section.upsell.container.innerHTML = updatedUpsell;
            const scrollableUpdated = section.upsell.container.querySelector(selectors.scrollable);
            scrollableUpdated && scrollableUpdated.scrollTo({
              top: scrollTopPosition
            });
          } else {
            section.upsell.container.outerHTML = "";
            section.upsell.container.remove();
          }
        } else {
          section.el.insertAdjacentHTML("beforeend", upsellDrawer.outerHTML);
        }
      }
      sectionContent.innerHTML = content.innerHTML;
    });
    setupSections();
    setupSliders();
    setupTermsAndConditions();
  }
  function emitQuickViewClickEvent(handle, variantId) {
    window.themeCore.EventBus.emit("product-card:quick-view:clicked", {
      productHandle: handle,
      variant: variantId
    });
  }
  async function emitAddToCard(variantId, quantity) {
    try {
      await window.themeCore.CartApi.makeRequest(window.themeCore.CartApi.actions.ADD_TO_CART, {
        id: variantId,
        quantity
      });
    } catch (error) {
      return error && error.description;
    }
  }
  function onQuantityChange(widget) {
    if (!widget || !widget.controls || !widget.controls.input) {
      return;
    }
    showPreloaders();
    const input = widget.controls.input;
    const key = input.dataset.itemKey;
    const quantity = widget.quantity.value;
    const sectionsIds = getSectionsIds().join(",");
    window.themeCore.CartApi.makeRequest(window.themeCore.CartApi.actions.CHANGE_CART_ITEM_QUANTITY, key, quantity, sectionsIds).then(async (cart) => {
      let item = cart.items.find((item2) => item2.key === key);
      if (item && quantity !== item.quantity) {
        const description = window.themeCore.translations.get("cart.errors.quantity", {
          count: item.quantity,
          title: item.title
        });
        hasErrors = true;
        setTimeout(() => {
          hasErrors = false;
        }, 0);
        throw { description };
      }
    }).catch((error) => {
      onQuantityError(widget, error);
    }).finally(() => {
      hidePreloaders();
    });
  }
  function onRemoveButtonClick(event) {
    const removeButton = event.target.closest(selectors.remove);
    if (!removeButton) {
      return;
    }
    event.preventDefault();
    showPreloaders();
    const sectionsIds = getSectionsIds().join(",");
    const key = removeButton.dataset.itemKey;
    window.themeCore.CartApi.makeRequest(window.themeCore.CartApi.actions.REMOVE_CART_ITEM, key, sectionsIds).finally(() => {
      hidePreloaders();
    });
  }
  function onQuantityError(quantityWidget, error) {
    if (!quantityWidget || !error) {
      return;
    }
    quantityWidget.rollbackValue();
    const cartItem = quantityWidget.widget.closest(selectors.cartItem);
    if (!cartItem) {
      return;
    }
    const errorEl = cartItem.querySelector(selectors.quantityError);
    errorEl.innerHTML = error.message || error.description;
  }
  function onUpsellFormSubmit(event) {
    const form = event.target;
    if (!form) {
      return;
    }
    event.preventDefault();
    const formData = formToJSON(form);
    const { id, handle, singleVariant, quantity } = formData;
    if (!JSON.parse(singleVariant)) {
      emitQuickViewClickEvent(handle, id);
      return;
    }
    showPreloaders();
    const submit = form.querySelector(selectors.submit);
    submit && submit.classList.add(classes.loading);
    emitAddToCard(id, Number(quantity)).then(() => {
      submit && submit.classList.remove(classes.loading);
      window.themeCore.EventBus.emit("Toggle:CartUpsellDrawer:close");
      hidePreloaders();
    });
  }
  function onCartUpdated(data) {
    let resource = null;
    if (data) {
      resource = data.sections;
    }
    if (!hasErrors) {
      refreshSections(resource).then(() => {
        const isNotificationEnable = window.themeCore.objects.settings.show_cart_notification;
        const isOpenCart = !data.params.some((param) => param.noOpen);
        if (!JSON.parse(isNotificationEnable) && isOpenCart) {
          window.themeCore.EventBus.emit("cart:drawer:open");
        }
      });
    }
  }
  function updateFreeShippingBar() {
    let freeShippingBar = document.querySelector(".js-cart-shipping");
    if (!freeShippingBar) {
      return;
    }
    let shop_currency_rate = Shopify.currency.rate || 1;
    let moneyFormat = window.themeCore.objects.shop.money_format;
    let cart_total = Number(freeShippingBar.getAttribute("data-cart-total"));
    let amount_cents = freeShippingBar.getAttribute("data-amount-cents") * shop_currency_rate;
    let percentage = cart_total / amount_cents * 100;
    let amount_message = freeShippingBar.getAttribute("data-amount-message");
    let success_message = freeShippingBar.getAttribute("data-success-message");
    let progressBar = freeShippingBar.querySelector(".js-cart-shipping-progress-bar");
    let shippingTextEl = freeShippingBar.querySelector(".js-cart-shipping-amount-msg");
    let shippingIcon = freeShippingBar.querySelector(".js-cart-shipping-icon");
    let progressBarHiddenText = freeShippingBar.querySelector(".js-shipping-bar-progress-hidden-text");
    let progressBarMessage = window.themeCore.translations.get("cart.shipping_bar.progress").replace("{{ value }}", percentage.toFixed(1));
    freeShippingBar.style.setProperty("--shipping-bar-progress-value", percentage + "%");
    if (progressBarHiddenText) {
      progressBarHiddenText.textContent = progressBarMessage;
    }
    if (percentage < 100) {
      let remaining = amount_cents - cart_total;
      let remaining_money = window.themeCore.utils.formatMoney(remaining, moneyFormat);
      let message = amount_message.replace("{amount}", `<strong>${remaining_money}</strong>`);
      shippingTextEl.innerHTML = message;
      progressBar.classList.remove(cssClasses.hidden);
      if (shippingIcon) {
        shippingIcon.classList.add(cssClasses.hidden);
      }
    } else {
      shippingTextEl.innerHTML = success_message;
      progressBar.classList.add(cssClasses.hidden);
      if (shippingIcon) {
        shippingIcon.classList.remove(cssClasses.hidden);
      }
    }
  }
  function initCartShippingCalculator() {
    new window.Shopify.CountryProvinceSelector("cart-address-country", "cart-address-province", {
      hideElement: "cart-address-province-container"
    });
    const submitRatesButton = document.querySelector(".js-get-ship-rates");
    const formElements = document.querySelectorAll(".js-ship-rate-field");
    const ratesCountry = document.getElementById("cart-address-country");
    const ratesProvince = document.getElementById("cart-address-province");
    const ratesZIP = document.getElementById("cart-address-zip");
    const responseWrapper = document.getElementById("cart-rates-wrapper");
    let shippingAddress = {
      country: "",
      province: "",
      zip: ""
    };
    formElements.forEach(function(field) {
      let eventName = "keyup";
      if (field.tagName === "SELECT") {
        eventName = "change";
      }
      field.addEventListener(eventName, () => {
        removeError(field);
      });
    });
    submitRatesButton.addEventListener("click", function(e) {
      e.preventDefault();
      submitRatesButton.setAttribute("disabled", "");
      shippingAddress.country = ratesCountry.value || "";
      shippingAddress.province = ratesProvince.value || "";
      shippingAddress.zip = ratesZIP.value || "";
      const params = `shipping_address[country]=${shippingAddress.country}&shipping_address[province]=${shippingAddress.province}&shipping_address[zip]=${shippingAddress.zip}`;
      const url = encodeURI(`${params}`);
      try {
        fetch(`/cart/prepare_shipping_rates.json?${url}`, {
          method: "POST"
        }).then((response) => response.text()).then((state) => {
          const parsedState = JSON.parse(state);
          if (typeof parsedState === "object" && parsedState !== null) {
            Object.entries(parsedState).forEach(([key, value]) => {
              const fieldElement = document.getElementById(`cart-address-${key}`);
              const errorElement = document.getElementById(`error-cart-address-${key}`);
              if (!errorElement) {
                return;
              }
              errorElement.textContent = `${value}`;
              errorElement.classList.remove(cssClasses.hidden);
              fieldElement.setAttribute("aria_invalid", "true");
              fieldElement.setAttribute("aria_describedby", `error-cart-address-${key}`);
            });
            submitRatesButton.removeAttribute("disabled");
            return;
          }
          fetch(`/cart/async_shipping_rates.json?${url}`).then((response) => response.text()).then((responseText) => {
            const parsedResponse = JSON.parse(responseText);
            const shippingRates = parsedResponse ? parsedResponse.shipping_rates : [];
            submitRatesButton.removeAttribute("disabled");
            if (shippingRates.length > 0) {
              responseWrapper.innerHTML = "";
              const ulElement = document.createElement("ul");
              ulElement.classList.add("cart-shipping-calc__rate-list");
              shippingRates.forEach((rate) => {
                const liElement = document.createElement("li");
                ulElement.appendChild(liElement);
                const name = rate.name;
                let price = rate.price;
                const deliveryDays = rate.delivery_days;
                let estimateTime = "";
                if (price === "0.00") {
                  price = window.themeCore.translations.get("cart.shipping_rates.price_free");
                } else {
                  price = `${window.themeCore.utils.formatMoney(
                    price.includes(".") ? price : price + ".00",
                    window.themeCore.objects.shop.money_format
                  )}`;
                }
                if (deliveryDays.length) {
                  deliveryDays.forEach((t, i) => {
                    estimateTime = i === 0 ? t : `${estimateTime}-${t}`;
                  });
                  estimateTime = `<span>${estimateTime} days</span>`;
                }
                liElement.innerHTML = `<span class="cart-shipping-calc__rate-name">${name}:</span> ${estimateTime} ${price}`;
              });
              responseWrapper.appendChild(ulElement);
            } else {
              responseWrapper.innerHTML = window.themeCore.translations.get("cart.shipping_rates.no_shipping");
            }
          });
        });
      } catch (e2) {
        console.log(e2, "Error with shipping rates");
      }
    });
    function removeError(formField) {
      if (!formField) {
        return;
      }
      const errorType = formField.id.split("cart-address-")[1];
      const errorMessage = document.getElementById(`error-cart-address-${errorType}`);
      formField.removeAttribute("aria_invalid");
      formField.removeAttribute("aria_describedby");
      if (errorMessage) {
        errorMessage.classList.add(cssClasses.hidden);
        errorMessage.textContent = "";
      }
    }
  }
  return Object.freeze({
    init
  });
};
const action = () => {
  window.themeCore.Cart = window.themeCore.Cart || Cart();
  window.themeCore.utils.register(window.themeCore.Cart, "cart-template");
};
if (window.themeCore && window.themeCore.loaded) {
  action();
} else {
  document.addEventListener("theme:all:loaded", action, { once: true });
}
