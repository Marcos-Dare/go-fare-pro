# Observabilidade

Este projeto integra duas ferramentas:

- **PostHog** — analytics de produto e eventos de negócio.
- **Sentry** — monitoramento de erros e exceções em runtime.

Ambas são inicializadas em `src/lib/observability.ts` e ativadas em `src/main.tsx`. Nenhuma chave fica hard-coded: tudo é lido de variáveis de ambiente Vite (`import.meta.env.VITE_*`). Se a chave correspondente não for definida, a integração simplesmente fica desligada (o app continua funcionando).

## 1. Configuração das chaves

Adicione (ou edite) o arquivo `.env` na raiz do projeto — **não comite valores reais**, use o `.env.example` como referência:

```env
# PostHog
VITE_POSTHOG_KEY=phc_xxx                 # Project API Key (Project settings → Project API key)
VITE_POSTHOG_HOST=https://us.i.posthog.com  # ou https://eu.i.posthog.com

# Sentry
VITE_SENTRY_DSN=https://xxxx@oXXXX.ingest.sentry.io/XXXX
VITE_SENTRY_ENVIRONMENT=production       # development | staging | production
VITE_APP_VERSION=1.0.0                   # usado como "release" no Sentry
```

### Onde obter as chaves

| Ferramenta | Onde encontrar |
|---|---|
| PostHog `VITE_POSTHOG_KEY` | PostHog → **Project settings** → **Project API key** |
| PostHog `VITE_POSTHOG_HOST` | US: `https://us.i.posthog.com` · EU: `https://eu.i.posthog.com` |
| Sentry `VITE_SENTRY_DSN` | Sentry → **Settings** → **Projects** → seu projeto → **Client Keys (DSN)** |

Em produção (Lovable / hospedagem), defina essas mesmas variáveis como secrets do build. Variáveis prefixadas com `VITE_` são embarcadas no bundle do frontend — por isso usamos sempre **chaves públicas (DSN / Project API key)**, que já foram desenhadas para ficar no cliente. Nunca coloque aqui chaves privadas (server secret / personal token).

Após alterar o `.env`, reinicie o servidor de desenvolvimento.

## 2. Dashboards de analytics (PostHog)

1. Acesse https://us.posthog.com (ou EU, conforme o host configurado) e abra o projeto.
2. **Eventos em tempo real** → menu lateral **Activity** → **Live events**. Confirme que os eventos da tabela abaixo aparecem.
3. **Dashboards** → menu lateral **Dashboards** → **+ New dashboard**. Sugestões de tiles:
   - *Trend* de `ride_completed` por dia (volume de corridas).
   - *Trend* de soma da propriedade `price` em `ride_completed` (faturamento).
   - *Funnel*: `user_login` → `ride_completed`.
   - *Trend* de `ride_cancelled` agrupado pela propriedade `reason`.
   - *Trend* da média de `rating` em `driver_rated` e `passenger_rated`.
4. **Insights individuais**: menu **Product analytics** → **+ New insight** para análises ad-hoc.
5. **Session replays** (opcional): menu **Session replay**. Já vem habilitado no SDK; basta ativar a feature no projeto.

## 3. Logs e erros (Sentry)

1. Acesse https://sentry.io → seu projeto.
2. **Issues** → lista todas as exceções não tratadas com stack trace, breadcrumbs (incluindo cada evento de analytics, marcado como breadcrumb `analytics`) e contexto da release/ambiente.
3. **Performance** → traces de transações (taxa de amostragem padrão: 20%, ajustável em `observability.ts`).
4. **Replays** → reproduções de sessão **só** quando ocorre erro (`replaysOnErrorSampleRate: 1.0`).
5. **Alertas**: **Alerts** → **Create alert** para receber e-mail/Slack em novos issues ou regressões.

Para reportar erros manualmente em qualquer ponto do código:

```ts
import { captureError } from "@/lib/observability";

try {
  // ...
} catch (err) {
  captureError(err, { context: "where_it_happened" });
}
```

## 4. Eventos monitorados

Definidos em `src/lib/observability.ts` (`Events` + helpers em `analytics.*`).

| Evento (PostHog) | Quando dispara | Propriedades |
|---|---|---|
| `user_login` | Primeira abertura do app no dispositivo (identificação anônima) ou após login real, quando autenticação for adicionada | `method`: `email` \| `google` \| `apple` \| `anonymous` |
| `ride_completed` | Motorista finaliza a corrida em `/corrida/:id` | `rideId`, `totalKm`, `price`, `pickups` |
| `ride_cancelled` | Corrida não concluída é excluída na Agenda | `rideId`, `status` (estado antes do cancelamento), `reason` |
| `driver_rated` | Avaliação preenchida ao finalizar a corrida | `rideId`, `driverId?`, `rating` (1–5), `comment?` |
| `passenger_rated` | Avaliação preenchida ao finalizar a corrida | `rideId`, `passengerName?`, `rating` (1–5), `comment?` |

Além disso, o PostHog captura automaticamente `$pageview` e `$pageleave` (navegação entre páginas) e o Sentry captura **todas** as exceções não tratadas e promises rejeitadas.

## 5. Adicionando novos eventos

1. Adicione o nome no objeto `Events` em `src/lib/observability.ts`.
2. Opcionalmente, crie um helper tipado em `analytics`.
3. Importe e chame onde o evento ocorrer:

```ts
import { analytics, track, Events } from "@/lib/observability";

analytics.rideCompleted({ rideId, totalKm, price, pickups });
// ou genérico:
track(Events.RideCompleted, { rideId, totalKm, price, pickups });
```

## 6. Desligando em desenvolvimento

Basta deixar `VITE_POSTHOG_KEY` e/ou `VITE_SENTRY_DSN` vazios. O console mostrará uma mensagem `[observability] ... disabled` e nenhuma requisição será feita.
