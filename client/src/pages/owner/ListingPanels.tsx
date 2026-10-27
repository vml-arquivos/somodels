import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { evaluateListingQuality } from "@shared/listing-quality";
import { Delta } from "./ui";

export function AvailabilityPanel({
  profile,
  onChanged,
}: {
  profile: any;
  onChanged: () => void;
}) {
  const set = trpc.profiles.setAvailability.useMutation({
    onSuccess: result => {
      toast.success(
        result.isAvailableNow
          ? "Você aparece como disponível agora"
          : "Disponibilidade desligada"
      );
      onChanged();
    },
    onError: error => toast.error(error.message),
  });
  const active =
    Boolean(profile.isAvailableNow) &&
    (!profile.availableUntil || new Date(profile.availableUntil) > new Date());
  return (
    <section className="od-card" aria-label="Disponível agora">
      <div className="od-card-head">
        <div>
          <p className="od-kicker">Disponível agora</p>
          <h2>{active ? "Você está disponível" : "Marcar como disponível"}</h2>
        </div>
        <span
          className={`od-dot ${active ? "is-on" : ""}`}
          aria-hidden="true"
        />
      </div>
      {active && profile.availableUntil && (
        <p className="od-muted">
          Até {new Date(profile.availableUntil).toLocaleString("pt-BR")}.
        </p>
      )}
      <div className="od-chips">
        {[2, 4, 8, 12].map(hours => (
          <button
            key={hours}
            type="button"
            className="od-chip"
            disabled={set.isPending}
            onClick={() =>
              set.mutate({ id: profile.id, available: true, hours })
            }
          >
            {hours}h
          </button>
        ))}
        {active && (
          <button
            type="button"
            className="od-chip is-danger"
            disabled={set.isPending}
            onClick={() => set.mutate({ id: profile.id, available: false })}
          >
            Desligar
          </button>
        )}
      </div>
      <small className="od-muted">
        Vale na hora e não passa por nova análise.
      </small>
    </section>
  );
}

export function QualityPanel({
  profile,
  media,
  identityVerified,
}: {
  profile: any;
  media: any[];
  identityVerified: boolean;
}) {
  const approved = media.filter(item => item.status === "approved");
  const result = evaluateListingQuality({
    description: profile.description,
    avatarUrl: profile.avatarUrl,
    priceFromCents: profile.priceFromCents,
    services: profile.services,
    attendancePlaces: profile.attendancePlaces,
    languages: profile.languages,
    availabilityLabel: profile.availabilityLabel,
    locationNote: profile.locationNote,
    photoCount: approved.filter(item => item.kind === "photo").length,
    videoCount: approved.filter(item => item.kind === "video").length,
    identityVerified,
  });
  return (
    <section className="od-card" aria-label="Qualidade do anúncio">
      <div className="od-card-head">
        <div>
          <p className="od-kicker">Qualidade do anúncio</p>
          <h2>{result.score}/100</h2>
        </div>
      </div>
      <div
        className="od-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={result.score}
      >
        <span style={{ width: `${result.score}%` }} />
      </div>
      {result.tips.length === 0 ? (
        <p className="od-muted">Seu anúncio está completo.</p>
      ) : (
        <ul className="od-tips">
          {result.tips.map(tip => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StatsPanel({ profileId }: { profileId: number }) {
  const [days, setDays] = useState<7 | 30>(30);
  const stats = trpc.profiles.stats.useQuery({ id: profileId, days });
  const max = Math.max(1, ...(stats.data?.daily.map(d => d.views) ?? [1]));
  return (
    <section className="od-card" aria-label="Desempenho do anúncio">
      <div className="od-card-head">
        <div>
          <p className="od-kicker">Desempenho</p>
          <h2>Visitas e contatos</h2>
        </div>
        <div className="od-chips">
          {([7, 30] as const).map(option => (
            <button
              key={option}
              type="button"
              className={`od-chip ${days === option ? "is-active" : ""}`}
              aria-pressed={days === option}
              onClick={() => setDays(option)}
            >
              {option} dias
            </button>
          ))}
        </div>
      </div>
      {stats.isLoading ? (
        <p className="od-muted">Carregando métricas…</p>
      ) : stats.error ? (
        <p className="od-error" role="alert">
          {stats.error.message}
        </p>
      ) : stats.data ? (
        <>
          <div className="od-mini-kpis">
            <div>
              <strong>{stats.data.totals.views}</strong>
              <span>visitas</span>
              <Delta
                current={stats.data.totals.views}
                previous={stats.data.previousTotals.views}
              />
            </div>
            <div>
              <strong>{stats.data.totals.contactClicks}</strong>
              <span>contatos</span>
              <Delta
                current={stats.data.totals.contactClicks}
                previous={stats.data.previousTotals.contactClicks}
              />
            </div>
          </div>
          <div
            className="od-bars is-small"
            role="img"
            aria-label={`Visitas por dia nos últimos ${stats.data.days} dias`}
          >
            {stats.data.daily.map(d => (
              <span
                key={d.date}
                className="od-bar"
                title={`${d.date}: ${d.views} visitas`}
              >
                <i
                  className="od-bar-views"
                  style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }}
                />
              </span>
            ))}
          </div>
          <small className="od-muted">
            Contagem agregada por dia, sem identificar visitantes.
          </small>
        </>
      ) : null}
    </section>
  );
}
