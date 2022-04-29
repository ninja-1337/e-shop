import { PolymerElement, html } from "@polymer/polymer/polymer-element.js";
import "@polymer/app-route/app-route.js";
import "@polymer/iron-flex-layout/iron-flex-layout.js";
import "./shop-button.js";
import "./shop-common-styles.js";
import "./shop-form-styles.js";
import "./shop-input.js";
import "./shop-select.js";
import "./shop-checkbox.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { timeOut } from "@polymer/polymer/lib/utils/async.js";

class ShopCheckout extends PolymerElement {
  static get template() {
    return html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Accept a payment</title>
          <meta name="description" content="A demo of a payment on Stripe" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <style>
            /* Variables */
            * {
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 16px;
              -webkit-font-smoothing: antialiased;
              display: flex;
              justify-content: center;
              align-content: center;
              height: 100vh;
              width: 100vw;
            }

            form {
              width: 30vw;
              min-width: 500px;
              align-self: center;
              box-shadow: 0px 0px 0px 0.5px rgba(50, 50, 93, 0.1),
                0px 2px 5px 0px rgba(50, 50, 93, 0.1),
                0px 1px 1.5px 0px rgba(0, 0, 0, 0.07);
              border-radius: 7px;
              padding: 40px;
            }

            .hidden {
              display: none;
            }

            #payment-message {
              color: rgb(105, 115, 134);
              font-size: 16px;
              line-height: 20px;
              padding-top: 12px;
              text-align: center;
            }

            #payment-element {
              margin-bottom: 24px;
            }

            /* Buttons and links */
            button {
              background: #5469d4;
              font-family: Arial, sans-serif;
              color: #ffffff;
              border-radius: 4px;
              border: 0;
              padding: 12px 16px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              display: block;
              transition: all 0.2s ease;
              box-shadow: 0px 4px 5.5px 0px rgba(0, 0, 0, 0.07);
              width: 100%;
            }
            button:hover {
              filter: contrast(115%);
            }
            button:disabled {
              opacity: 0.5;
              cursor: default;
            }

            /* spinner/processing state, errors */
            .spinner,
            .spinner:before,
            .spinner:after {
              border-radius: 50%;
            }
            .spinner {
              color: #ffffff;
              font-size: 22px;
              text-indent: -99999px;
              margin: 0px auto;
              position: relative;
              width: 20px;
              height: 20px;
              box-shadow: inset 0 0 0 2px;
              -webkit-transform: translateZ(0);
              -ms-transform: translateZ(0);
              transform: translateZ(0);
            }
            .spinner:before,
            .spinner:after {
              position: absolute;
              content: "";
            }
            .spinner:before {
              width: 10.4px;
              height: 20.4px;
              background: #5469d4;
              border-radius: 20.4px 0 0 20.4px;
              top: -0.2px;
              left: -0.2px;
              -webkit-transform-origin: 10.4px 10.2px;
              transform-origin: 10.4px 10.2px;
              -webkit-animation: loading 2s infinite ease 1.5s;
              animation: loading 2s infinite ease 1.5s;
            }
            .spinner:after {
              width: 10.4px;
              height: 10.2px;
              background: #5469d4;
              border-radius: 0 10.2px 10.2px 0;
              top: -0.1px;
              left: 10.2px;
              -webkit-transform-origin: 0px 10.2px;
              transform-origin: 0px 10.2px;
              -webkit-animation: loading 2s infinite ease;
              animation: loading 2s infinite ease;
            }

            @-webkit-keyframes loading {
              0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
              }
              100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
              }
            }
            @keyframes loading {
              0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
              }
              100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
              }
            }

            @media only screen and (max-width: 600px) {
              form {
                width: 80vw;
                min-width: initial;
              }
            }
          </style>

          <script src="https://js.stripe.com/v3/"></script>
          <script src="checkout.js" defer></script>
        </head>
        <body>
          <iron-form
            id="checkoutForm"
            on-iron-form-response="_didReceiveResponse"
            on-iron-form-presubmit="_willSendRequest"
          >
            <form
              method="post"
              action="data/sample_success_response.json"
              enctype="application/x-www-form-urlencoded"
            ></form>
          </iron-form>

          <!-- Display a payment form -->
          <form id="payment-form">
            <div id="payment-element">
              <!--Stripe.js injects the Payment Element-->
            </div>
            <button id="submit">
              <div class="spinner hidden" id="spinner"></div>
              <span id="button-text">Pay now</span>
            </button>
            <div id="payment-message" class="hidden"></div>
          </form>
        </body>
      </html>
    `;
  }
  static get is() {
    return "shop-checkout";
  }

  static get properties() {
    return {
      /**
       * The route for the state. e.g. `success` and `error` are mounted in the
       * `checkout/` route.
       */
      route: {
        type: Object,
        notify: true,
      },

      /**
       * The total price of the contents in the user's cart.
       */
      total: Number,

      /**
       * The state of the form. Valid values are:
       * `init`, `success` and `error`.
       */
      state: {
        type: String,
        value: "init",
      },

      /**
       * An array containing the items in the cart.
       */
      cart: Array,

      /**
       * The server's response.
       */
      response: Object,

      /**
       * If true, the user must enter a billing address.
       */
      hasBillingAddress: {
        type: Boolean,
        value: false,
      },

      /**
       * If true, shop-checkout is currently visible on the screen.
       */
      visible: {
        type: Boolean,
        observer: "_visibleChanged",
      },

      /**
       * True when waiting for the server to repond.
       */
      waiting: {
        type: Boolean,
        readOnly: true,
        reflectToAttribute: true,
      },

      /**
       * True when waiting for the server to repond.
       */
      _hasItems: {
        type: Boolean,
        computed: "_computeHasItem(cart.length)",
      },
    };
  }

  static get observers() {
    return ["_updateState(routeActive, routeData)"];
  }

  _submit(e) {
    if (this._validateForm()) {
      console.log("damesa");
      fetch("http://localhost:3000/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            { id: 1, quantity: 3 },
            { id: 2, quantity: 1 },
          ],
        }),
      })
        .then((res) => {
          if (res.ok) return res.json();
          return res.json().then((json) => Promise.reject(json));
        })
        .then(({ url }) => {
          window.location = url;
        })
        .catch((e) => {
          console.error(e.error);
        });
    }
  }

  /**
   * Sets the valid state and updates the location.
   */
  _pushState(state) {
    this._validState = state;
    this.set("route.path", state);
  }

  /**
   * Checks that the `:state` subroute is correct. That is, the state has been pushed
   * after receiving response from the server. e.g. Users can only go to `/checkout/success`
   * if the server responsed with a success message.
   */
  _updateState(active, routeData) {
    if (active && routeData) {
      let state = routeData.state;
      if (this._validState === state) {
        this.state = state;
        this._validState = "";
        return;
      }
    }
    this.state = "init";
  }

  /**
   * Sets the initial state.
   */
  _reset() {
    let form = this.$.checkoutForm;

    this._setWaiting(false);
    form.reset && form.reset();

    let nativeForm = form._form;
    if (!nativeForm) {
      return;
    }

    // Remove the `aria-invalid` attribute from the form inputs.
    for (
      let el, i = 0;
      (el = nativeForm.elements[i]), i < nativeForm.elements.length;
      i++
    ) {
      el.removeAttribute("aria-invalid");
    }
  }

  /**
   * Validates the form's inputs and adds the `aria-invalid` attribute to the inputs
   * that don't match the pattern specified in the markup.
   */
  _validateForm() {
    let form = this.$.checkoutForm;
    let firstInvalid = false;
    let nativeForm = form._form;

    for (
      let el, i = 0;
      (el = nativeForm.elements[i]), i < nativeForm.elements.length;
      i++
    ) {
      if (el.checkValidity()) {
        el.removeAttribute("aria-invalid");
      } else {
        if (!firstInvalid) {
          // announce error message
          if (el.nextElementSibling) {
            this.dispatchEvent(
              new CustomEvent("announce", {
                bubbles: true,
                composed: true,
                detail: el.nextElementSibling.getAttribute("error-message"),
              })
            );
          }
          if (el.scrollIntoViewIfNeeded) {
            // safari, chrome
            el.scrollIntoViewIfNeeded();
          } else {
            // firefox, edge, ie
            el.scrollIntoView(false);
          }
          el.focus();
          firstInvalid = true;
        }
        el.setAttribute("aria-invalid", "true");
      }
    }
    return !firstInvalid;
  }

  /**
   * Adds the cart data to the payload that will be sent to the server
   * and updates the UI to reflect the waiting state.
   */
  _willSendRequest(e) {
    let form = e.target;
    let body = form.request && form.request.body;

    this._setWaiting(true);

    if (!body) {
      return;
    }
    // Populate the request body where `cartItemsId[i]` is the ID and `cartItemsQuantity[i]`
    // is the quantity for some item `i`.
    body.cartItemsId = [];
    body.cartItemsQuantity = [];

    this.cart.forEach((cartItem) => {
      body.cartItemsId.push(cartItem.item.name);
      body.cartItemsQuantity.push(cartItem.quantity);
    });
  }

  /**
   * Handles the response from the server by checking the response status
   * and transitioning to the success or error UI.
   */
  _didReceiveResponse(e) {
    let response = e.detail.response;

    this.response = response;
    this._setWaiting(true);

    if (response.success) {
      this._pushState("success");
      this._reset();
      this.dispatchEvent(
        new CustomEvent("clear-cart", { bubbles: true, composed: true })
      );
    } else {
      this._pushState("error");
    }
  }

  _toggleBillingAddress(e) {
    this.hasBillingAddress = e.target.checked;

    if (this.hasBillingAddress) {
      this.$.billAddress.focus();
    }
  }

  _computeHasItem(cartLength) {
    return cartLength > 0;
  }

  _formatPrice(total) {
    return isNaN(total) ? "" : "$" + total.toFixed(2);
  }

  _getEntryTotal(entry) {
    return this._formatPrice(entry.quantity * entry.item.price);
  }

  _visibleChanged(visible) {
    if (!visible) {
      return;
    }
    // Reset the UI states
    this._reset();
    // Notify the page's title
    this.dispatchEvent(
      new CustomEvent("change-section", {
        bubbles: true,
        composed: true,
        detail: { title: "Checkout" },
      })
    );
  }
}

customElements.define(ShopCheckout.is, ShopCheckout);
