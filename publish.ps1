# 一键部署到 GitHub Pages（Windows PowerShell）
# 用法：右键本文件 → 用 PowerShell 运行，按提示输入 GitHub 用户名。
# 前置：
#   1) 已安装 git（https://git-scm.com）
#   2) 已在 GitHub 网页建好空仓库（建议名 xiaowang-workbench，Public）
#   3) 本机 git 已配置凭据（GitHub Desktop 登录过 / 配了 SSH key / Personal Access Token）

param(
  [string]$User = "",
  [string]$Repo = "xiaowang-workbench"
)

if (-not $User) { $User = Read-Host "请输入你的 GitHub 用户名" }
$remote = "https://github.com/$User/$Repo.git"
Write-Host "目标仓库: $remote"

git init
git config user.name "$User"
git config user.email "$User@users.noreply.github.com"
git add -A
git commit -m "init: 小王的工作台 PWA v20"
git branch -M main
git remote remove origin 2>$null
git remote add origin $remote
git push -u origin main

Write-Host ""
Write-Host "推送完成。请到 GitHub 仓库 Settings -> Pages，Source 选 main / (root)，Save。"
Write-Host "稍等 1-2 分钟，访问 https://$User.github.io/$Repo/"
