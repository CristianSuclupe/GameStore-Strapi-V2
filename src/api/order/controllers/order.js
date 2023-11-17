"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const paypal = require("@paypal/checkout-server-sdk");

const calcDiscountPrice = (price, discount) => {
  if (!discount) return price;
  const discountAmount = (price * discount) / 100;
  const result = price - discountAmount;
  return result.toFixed(2);
};

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

const enviroment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(enviroment);
module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async createPaymentOrder(ctx) {
    const { products } = ctx.request.body;
    let totalPayment = 0;
    products.forEach((product) => {
      const priceTemp = calcDiscountPrice(
        product.attributes.price,
        product.attributes.discount
      );
      totalPayment += Number(priceTemp) * product.quantity;
    });
    const request = new paypal.orders.OrdersCreateRequest();
    const order = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: totalPayment.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: totalPayment.toFixed(2),
              },
            },
          },
          items: products.map((product) => ({
            name: product.attributes.title,
            unit_amount: {
              currency_code: "USD",
              value: calcDiscountPrice(
                product.attributes.price,
                product.attributes.discount
              ),
            },
            quantity: product.quantity,
          })),
        },
      ],
    };
    request.requestBody(order);
    const response = await client.execute(request);
    return {
      id: response.result.id,
    };
  },
}));
