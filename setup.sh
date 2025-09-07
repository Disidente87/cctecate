#!/bin/bash

# Script de configuración para Creando Consciencia Tecate
echo "🚀 Configurando Creando Consciencia Tecate..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Se requiere Node.js 18 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Crear archivo .env.local si no existe
if [ ! -f ".env.local" ]; then
    echo "📝 Creando archivo de configuración..."
    cp env.example .env.local
    echo "⚠️  Por favor configura las variables de entorno en .env.local"
    echo "   - Ve a https://supabase.com/dashboard"
    echo "   - Crea un nuevo proyecto"
    echo "   - Copia la URL y las claves API"
    echo "   - Ejecuta el script SQL en supabase-schema.sql"
else
    echo "✅ Archivo .env.local ya existe"
fi

# Verificar configuración de Supabase
echo "🔍 Verificando configuración..."
if grep -q "your_supabase" .env.local; then
    echo "⚠️  Recuerda configurar las variables de Supabase en .env.local"
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura las variables de entorno en .env.local"
echo "2. Crea un proyecto en Supabase (https://supabase.com/dashboard)"
echo "3. Ejecuta el script SQL en supabase-schema.sql"
echo "4. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
echo ""
echo "🌐 La aplicación estará disponible en http://localhost:3000"
echo ""
echo "📚 Para más información, consulta el README.md"
