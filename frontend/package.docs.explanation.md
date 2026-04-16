# Objaśnienie zależności — frontend

## dependencies

- **fabric** — główna biblioteka canvas; obsługuje rysowanie, obiekty (prostokąty, ścieżki, tekst), serializację do JSON oraz eksport do obrazu
- **react** — framework UI; odpowiada za renderowanie komponentów i zarządzanie stanem
- **react-dom** — łączy React z przeglądarką; montuje aplikację w drzewie DOM
- **react-router-dom** — obsługuje routing między stronami (np. Lobby → Board po kliknięciu "New board")
- **uuid** — generuje unikalne identyfikatory; używane dla sesji oraz obiektów na canvasie (customId)

## devDependencies

- **vite** — bundler i dev server; zapewnia szybki hot reload podczas pracy nad projektem
- **@vitejs/plugin-react** — wtyczka integrująca Vite z React (obsługa JSX i Fast Refresh)
- **typescript** — kompilator TypeScript; wykrywa błędy typów przed uruchomieniem kodu
- **@types/react** — typy TypeScript dla biblioteki React
- **@types/react-dom** — typy TypeScript dla react-dom
- **@types/uuid** — typy TypeScript dla biblioteki uuid
