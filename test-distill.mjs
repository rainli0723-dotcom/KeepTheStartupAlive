import { readFileSync } from "fs";
import { resolve } from "path";

const MEMBER_ID = "cmpliftgi002pu0h0skqx2eou"; // 创始人
const API = `http://localhost:3000/api/team/${MEMBER_ID}/distill`;

// Read test file content
const testFile = resolve("./test-persona.txt");
const fileContent = readFileSync(testFile, "utf8");

if (!fileContent.trim()) {
  console.log("❌ test-persona.txt 为空，先创建...");
  import("fs").then(fs => {
    fs.writeFileSync(testFile, `张伟是一位有12年SaaS销售经验的连续创业者，擅长B2B谈判和大客户管理。
他性格果断，决策倾向数据驱动，但在压力下会变得保守。
他常说："数据不说谎"和"先拿下灯塔客户，再做规模化"。
他的核心价值观是以客户成功为北极星，不做损害客户长期利益的事。
专业边界是不参与纯技术决策，但会追问技术方案对交付时间线的影响。`, "utf8");
    console.log("✅ 已创建 test-persona.txt，请重新运行 node test-distill.mjs");
  });
  process.exit(0);
}

const blob = new Blob([fileContent], { type: "text/plain" });
const formData = new FormData();
formData.append("file", blob, "张伟-创始人资料.txt");

console.log("🚀 开始蒸馏 创始人 的数字孪生画像...");
const start = Date.now();

try {
  const res = await fetch(API, { method: "POST", body: formData });
  const body = await res.json();

  console.log(`⏱ 耗时: ${Date.now() - start}ms`);
  console.log(`📡 状态码: ${res.status}`);

  if (res.ok) {
    console.log("\n✅ 蒸馏成功！");
    console.log("📋 蒸馏画像:");
    console.log(JSON.stringify(body.profile, null, 2));
  } else {
    console.log("\n❌ 蒸馏失败:");
    console.log(JSON.stringify(body, null, 2));
  }
} catch (err) {
  console.log("\n❌ 请求失败:", err.message);
}
