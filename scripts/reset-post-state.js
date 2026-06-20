const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "data", "products.json");
const state = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
const products = state.products || [];

if (!process.argv.includes("--confirm")) {
  console.error("Reset cancelado. Use --confirm somente quando quiser liberar repostagens.");
  process.exit(1);
}

let cleared = 0;
for (const product of products) {
  if (product.lastGroupPostedAt) {
    delete product.lastGroupPostedAt;
    delete product.lastGroupPostSignature;
    cleared++;
  }
}

fs.writeFileSync(dataPath, JSON.stringify(state, null, 2), "utf8");
console.log(`Resetado: ${cleared} produto(s) tiveram lastGroupPostedAt removido.`);
console.log(`Total de produtos: ${products.length}`);
