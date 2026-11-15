# Shopier product API support ticket (draft)

**Subject:** Product read/update endpoints return 403 while create/delete succeed — merchant `rookworks`

Hello Shopier Developer Support,

We are integrating the Shopier REST API for our own store, `https://www.shopier.com/rookworks`, using a PAT created in the seller panel. Orders, categories, shop settings, and webhook subscriptions work, but product **read/update** endpoints return HTTP 403. Product **create/delete** succeeds. We need help identifying the account or permission setting that causes the split.

## Authentication and endpoint

- Base URL: `https://api.shopier.com/v1`
- Header: `Authorization: Bearer [REDACTED]` (PAT, not included)
- API version: `v1` (path-based)
- Accept: `application/json`
- User-Agent: `RookWorks/1.0`
- PAT scopes in the token: `orders:read`, `orders:write`, `products:read`, `products:write`, `shippings:read`, `shippings:write`, `discounts:read`, `discounts:write`, `payouts:read`, `refunds:read`, `refunds:write`, `shop:read`, `shop:write`
- Account/shop: `rookworks`

## Observed method matrix

| Method | Endpoint | Result |
|---|---|---|
| GET | `/products` | **403** `{"error":"forbidden","message":"Access to this resource on the server is denied"}` |
| GET | `/products?limit=50` | **403** (same body) |
| GET | `/products/{productId}` | **403** (same body) |
| PUT | `/products/{productId}` | **403** (same body) |
| POST | `/products` | **200** — product created successfully |
| POST | `/products` (empty body) | **400** `title is required` (permission passes) |
| DELETE | `/products/{productId}` | **200** — product deleted |
| GET | `/orders` | **200** |
| GET | `/categories` | **200** |
| GET | `/shop/settings` | **200** |
| GET | `/webhooks` | **200** |
| POST | `/webhooks` | **200** — subscription created |

The 403 body has no `requestId`, `code`, or scope detail. The token is valid and the same token successfully calls orders, categories, shop settings, and webhooks.

## Request

1. Confirm whether `products:read` and product update permission are enabled for this merchant/PAT.
2. Explain why `GET /products` and `GET /products/{id}` are forbidden while `POST /products` and `DELETE /products/{id}` are allowed.
3. Tell us the exact Shopier panel setting or app permission required (developer mode, app review, seller API access, etc.).
4. If this is an API/account defect, please correct the product read/update permissions for `rookworks`.

## Documentation checked

- Products list: https://developer.shopier.com/reference/get-products
- Product create: https://developer.shopier.com/reference/post-products
- Product update: https://developer.shopier.com/reference/put-products-id
- Response codes (403 = additional permission / contact support): https://developer.shopier.com/reference/response-codes
- PATs: https://developer.shopier.com/docs/creating-and-using-pats
- Permission scopes: https://developer.shopier.com/docs/permission-scopes

No PAT or customer data is included in this ticket.
