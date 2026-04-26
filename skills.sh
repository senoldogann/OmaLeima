#!/bin/bash

# ==============================================================================
# OmaLeima - AI Agent Environment & Skills Setup Script
# Bu script, Digital Leima projesini geliştiren AI Ajanlarının ve geliştiricilerin
# ihtiyaç duyacağı tüm Global CLI araçlarını, eklentileri ve ortamı kurar.
# ==============================================================================

echo "🚀 OmaLeima AI Agent Environment Setup Başlıyor..."

# 1. Supabase CLI (Veritabanı migration'ları ve Edge Function testleri için kritik)
echo "📦 Supabase CLI kuruluyor..."
if command -v brew &> /dev/null; then
    brew install supabase/tap/supabase
else
    npm install -g supabase
fi

# 2. Expo ve EAS CLI (Mobil uygulama derlemeleri ve push bildirimi sertifikaları için)
echo "📱 EAS CLI (Expo) kuruluyor..."
npm install -g eas-cli
npm install -g create-expo-app

# 3. Next.js ve Vercel CLI (Admin paneli yönetimi ve dağıtımı için)
echo "🌐 Vercel CLI kuruluyor..."
npm install -g vercel

# 4. TypeScript & Linting (Ajanların hata ayıklaması ve scratchpad çalıştırması için)
echo "🛠️ Global TypeScript araçları kuruluyor..."
npm install -g typescript ts-node eslint prettier

# 5. Model Context Protocol (MCP) Kurulum Hatırlatması
echo "🧠 MCP (Model Context Protocol) Bilgilendirmesi:"
echo "AI Ajanları için yerel Postgres veritabanını analiz etme MCP'si önerilir."
echo "Claude Desktop kullanıyorsanız, config dosyanıza aşağıdaki MCP server'ı eklemeyi unutmayın:"
echo "---"
echo '"mcpServers": {'
echo '  "postgres": {'
echo '    "command": "npx",'
echo '    "args": ['
echo '      "-y",'
echo '      "@modelcontextprotocol/server-postgres",'
echo '      "postgresql://postgres:postgres@localhost:54322/postgres"'
echo '    ]'
echo '  }'
echo '}'
echo "---"

echo "✅ Kurulum tamamlandı! AI Ajanları artık Faz 1'e (Supabase DB) başlamak için tamamen hazır."
