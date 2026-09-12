# 1. Use the official Node 20 slim image
# (We choose Debian-based 'slim' over Alpine because packages like 'bcrypt' 
# have pre-compiled glibc binaries that work out of the box)
FROM node:20-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# 4. Install production dependencies (skips devDependencies like nodemon)
RUN npm ci --only=production

# 5. Copy the rest of the application files
COPY . .

# 6. Default Cloud Run port
ENV PORT=8080
EXPOSE 8080

# 7. Start the Express server
CMD ["npm", "start"]