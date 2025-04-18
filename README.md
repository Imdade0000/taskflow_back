# 🧠 NestJS + Prisma + MySQL – Backend API

> API backend construite avec NestJS, Prisma ORM et MySQL.  
> Projet collaboratif avec gestion du code via GitHub, documentation Swagger et seeding automatique.

---

## 🚀 Stack Technique

- **Framework** : [NestJS](https://nestjs.com/)
- **ORM** : [Prisma](https://www.prisma.io/)
- **Base de données** : MySQL
- **Documentation API** : Swagger
- **Gestion de config** : @nestjs/config
- **ID unique** : uuid
- **Versioning & Collaboration** : GitHub Flow

---

## ⚙️ Installation

```bash
# Cloner le projet
git clone https://github.com/ton-org/ton-projet.git
cd ton-projet

# Installer les dépendances
npm install

# Configurer les variables d’environnement
cp .env.example .env
```

---

## 🧬 .env attendu

```env
DATABASE_URL="mysql://user:password@localhost:3306/nom_de_ta_db"
JWT_SECRET="ton_secret"
```

---

## 📂 Structure

```
src/
├── prisma/              # Schéma et seeders
├── modules/             # Modules métiers
├── common/              # DTOs, constantes, helpers
└── main.ts              # Entrée de l'application
```

---

## 🔧 Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Lancer les migrations
npx prisma migrate dev --name init

# Lancer Prisma Studio
npx prisma studio

# Seed de base
npx prisma db seed
```

---

## 🌱 Seed initial

Le seeder met en place :

- Rôles : `SUPER_ADMIN`, `ADMIN`, `USER`
- Utilisateur Super Admin :
  - Email : `superadmin@example.com`
  - Mot de passe : `SuperSecurePassword123!` (à hasher si auth active)

---

## 🧪 Démarrage local

```bash
npm run start:dev
```

Swagger disponible sur :  
👉 `http://localhost:3000/api`

---

## 🛡 Sécurité & Auth

> (À activer si auth prévue)

- JWT configurable via `JWT_SECRET`
- Auth par rôle gérée via les modèles `Role` et `Permission`
- Middleware / guards personnalisables

---

## 🧭 Gestion de projet GitHub (collaboration)

- Travail en **branches de fonctionnalité**
- Une branche = une tâche issue
- Nommage : `feature/<nom>`, `fix/<nom>`
- Pull request + review obligatoire
- `dev` = branche de développement continue
- `main` = branche de production

---

## 📘 Docs API (Swagger)

```ts
// Swagger setup dans main.ts
SwaggerModule.setup('api', app, document);
```

📚 Accès : `http://localhost:3000/api`

Les DTOs sont annotés avec `@ApiProperty` pour enrichir la documentation.

---

## 📒 Documentation interne

Ajouter vos fichiers internes dans :

```
/docs/
├── endpoints.md
├── database-schema.md
├── roles-permissions.md
├── setup.md
```

---

## 🛠 Dépendances clés

```bash
# Base
npm i @nestjs/common @nestjs/core @nestjs/config

# Prisma
npm i @prisma/client
npm i prisma --save-dev

# Swagger
npm i @nestjs/swagger swagger-ui-express

# UUID
npm i uuid
```

---

## ✍️ Auteurs

- **TonNom** – Lead backend
- **TonCollègue** – Dév backend

---

## 📦 À venir

- Authentification + Guards
- Gestion de fichiers (upload)
- CI/CD avec GitHub Actions
- Déploiement Docker

---