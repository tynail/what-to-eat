FROM node:24-alpine AS frontend
WORKDIR /src/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY NuGet.Config ./
COPY server/MealPlanner.csproj server/
RUN dotnet restore server/MealPlanner.csproj --configfile NuGet.Config
COPY server/ server/
RUN dotnet publish server/MealPlanner.csproj -c Release -o /out --no-restore
COPY --from=frontend /src/client/dist /out/wwwroot

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /out ./
RUN mkdir /data && chown app:app /data
USER app
ENV ASPNETCORE_HTTP_PORTS=8080 DataDirectory=/data
EXPOSE 8080
ENTRYPOINT ["dotnet", "MealPlanner.dll"]
