export const DEFAULT_PDF_TEMPLATE_STYLE = `
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap");
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  position: relative;
  font-size: 14px;
  font-family: Roboto, sans-serif;
  line-height: 1.35;
  color: #000;
  width: 672px;
  padding-top: 15px;
}
.text-bold {
  font-weight: bold;
}
.text-right {
  text-align: right;
}
h1 {
  font-weight: bolder;
  font-size: 38px;
  margin-bottom: 10px;
}
h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
}
h3 {
  font-size: 25px;
  font-weight: 700;
  margin-bottom: 5px;
}
p {
  font-size: 14px;
}
table {
  width: 100%;
  border-collapse: collapse;
  border-style: hidden;
}
th, td {
  text-align: center;
  padding: 10px;
  min-height: 30px;
  border: 1px solid #e5e5e5;
  font-size: 13px;
  word-break: break-word;
}
table.size-small th, table.size-small td {
  padding: 4px 3px;
  font-size: 9px;
}
.offer .sellerInfo {
  display: inline-flex;
  align-items: center;
}
.offer .sellerInfo span {
  display: block;
  color: #525252;
  margin-right: 8px;
}
`;
