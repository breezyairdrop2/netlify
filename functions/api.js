import express from "express";
import ServerlessHttp from "serverless-http";
import cors from "cors";
import stripe from 'stripe';
import * as bodyParser from "body-parser";
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const stripe = require("stripe")("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");
const stripe_instance = new stripe('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')
const app = express();

app.use(cors("*"));

app.use(bodyParser.json());

app.post("/.netlify/functions/api", async (req, res) => {
  let checkoutItems = JSON.parse(JSON.stringify(req.body));
  let shippingData = "";

  console.log(checkoutItems);

  if (checkoutItems?.deliveryOption?.type == "pickup") {
    shippingData = {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: 0,
          currency: "usd",
        },
        display_name: "Pickup at store.",
      },
    };
  } else if (checkoutItems?.deliveryOption?.type == "shipping") {
    shippingData = {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: checkoutItems?.deliveryOption?.amount,
          currency: "usd",
        },
        display_name: "Standard Shipping",
        delivery_estimate: {
          minimum: {
            unit: "business_day",
            value: 2,
          },
          maximum: {
            unit: "business_day",
            value: 5,
          },
        },
      },
    };
  }

  // Shipping rate
  const session = await stripe_instance.checkout.sessions.create({
    shipping_address_collection: {
      allowed_countries: ["CA"],
    },
    shipping_options: [shippingData],
    line_items: checkoutItems?.checkoutLists,
    mode: "payment",
    automatic_tax: { enabled: true },
    success_url: "https://jesoevents.com/success",
    cancel_url: "https://jesoevents.com/cart",
  });
  res.send(session.url);
});

app.get("/complete", async (req, res) => {
  const result = Promise.all([
    stripe_instance.checkout.sessions.retrieve(req.query.session_id, {
      expand: ["payment_intent.payment_method"],
    }),
    stripe_instance.checkout.sessions.listLineItems(req.query.session_id),
  ]);

  console.log(JSON.stringify(await result));

  res.send("Your payment was successful");
});

app.get("/cancel", (req, res) => {
  res.redirect("/");
});

const handler = ServerlessHttp(app);

module.exports.handler = async (event, context) => {
  const result = await handler(event, context);
  return result;
};
