import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle2, Award } from 'lucide-react';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';
import XpHistory from './profile/XpHistory';
import { ShowcaseEditor } from '@/features/badges/ShowcaseEditor';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { gqlRequest } from '@/app/graphql.client';

const GET_BADGE_DEFS = `
  query { badgeDefinitions { id holderCount } }
`;

function ShowcaseSection() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const [enrichedBadges, setEnrichedBadges] = useState(null);

  useEffect(() => {
    if (!user?.badges?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnrichedBadges([]);
      return;
    }
    gqlRequest(GET_BADGE_DEFS)
      .then(({ badgeDefinitions }) => {
        // Total users is not returned here — estimate rarity from holderCount relative to holder list
        // We use a safe default: show badges without rarity percentage if defs unavailable
        const defMap = new Map(badgeDefinitions.map(d => [d.id, d]));
        const maxHolders = Math.max(...badgeDefinitions.map(d => d.holderCount), 1);
        setEnrichedBadges(
          user.badges.map(b => ({
            ...b,
            // holderCount / maxHolders gives relative rarity (good enough for filter ordering)
            rarityPct: defMap.has(b.id)
              ? (defMap.get(b.id).holderCount / Math.max(maxHolders, 1)) * 100
              : 100,
          }))
        );
      })
      .catch(() => setEnrichedBadges(user.badges));
  }, [user?.badges]);

  if (!enrichedBadges) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="size-3.5 text-zinc-500" />
        <SectionHeading>{t('badges.showcase.editorTitle')}</SectionHeading>
      </div>
      <ShowcaseEditor
        userBadges={enrichedBadges}
        initialShowcase={user?.showcasedBadges ?? []}
        initialPublic={user?.showcasePublic ?? true}
        showcaseSlots={getShowcaseSlots(user?.progression?.level ?? 0)}
        level={user?.progression?.level ?? 0}
        onSaved={(ids, pub) => setUser(prev => ({ ...prev, showcasedBadges: ids, showcasePublic: pub }))}
      />
    </section>
  );
}

function getShowcaseSlots(level) {
  if (level >= 100) return 8;
  if (level >= 75)  return 6;
  if (level >= 50)  return 5;
  if (level >= 25)  return 4;
  return 3;
}

function SectionHeading({ children }) {
  return (
    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
      {children}
    </h4>
  );
}

function Divider() {
  return <hr className="border-border/50" />;
}

function blockMatches(searchTerm, labels) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();

  const matches = blockMatches(searchTerm, [
    t('profile.tabs.account'), t('profile.title'),
    t('profile.sections.public'), t('profile.displayName'), t('profile.bio'),
    t('profile.emailSection'), t('profile.email'),
    t('profile.accountNameSection'), t('profile.accountName'),
    t('profile.showFollowers'), t('profile.avatar'),
    'avatar', 'photo', 'display name', 'bio', 'email', 'username', 'handle',
    'followers', 'profile', 'public',
  ]);

  if (!matches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <UserCircle2 className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.account')}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        {/* Avatar */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.sections.public')}</SectionHeading>
          <AvatarUpload />
        </section>

        <Divider />

        {/* Display name + bio + visibility */}
        <ProfileForm />

        <Divider />

        {/* Email */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.emailSection')}</SectionHeading>
          <EmailSection />
        </section>

        <Divider />

        {/* Username */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.accountNameSection')}</SectionHeading>
          <AccountNameSection />
        </section>

        <Divider />

        {/* Achievement Showcase */}
        <ShowcaseSection />

        <Divider />

        {/* XP History */}
        <section className="space-y-4">
          <SectionHeading>XP History</SectionHeading>
          <XpHistory />
        </section>
      </div>
    </div>
  );
}
