export const BADGE_REGISTRY = {
  og:          { label: 'OG',            icon: '🏆', color: 'amber',   condition: 'First 100 users'               },
  pioneer:     { label: 'Pioneer',       icon: '🚀', color: 'teal',    condition: 'First 1,000 users'             },
  syncer10h:   { label: 'Synced 10h',    icon: '🎵', color: 'green',   condition: '10 hours of lyrics synced'     },
  syncer100h:  { label: 'Synced 100h',   icon: '🎶', color: 'green',   condition: '100 hours of lyrics synced'    },
  wordsmith1k: { label: 'Wordsmith',     icon: '✍️', color: 'blue',    condition: '1,000 words timestamped'       },
  wordsmith50k:{ label: 'Lyric Master',  icon: '📖', color: 'shimmer', condition: '50,000 words timestamped'      },
  karaoke100:  { label: 'Karaoke Hero',  icon: '🎤', color: 'orange',  condition: '100 karaoke lines synced'      },
  karaoke1k:   { label: 'Stage Star',    icon: '🌟', color: 'amber',   condition: '1,000 karaoke lines synced'    },
  century:     { label: 'Century',       icon: '💫', color: 'shimmer', condition: '100 projects created'          },
  published10: { label: 'Publisher',     icon: '📢', color: 'teal',    condition: '10 public projects'            },
  beloved:     { label: 'Beloved',       icon: '⭐', color: 'amber',   condition: '50 stars received'             },
  influential: { label: 'Influential',   icon: '🌿', color: 'green',   condition: 'Work forked 25 times'          },
  following50: { label: 'Well Connected',icon: '🤝', color: 'primary', condition: '50 followers'                  },
  uploader:    { label: 'Uploader',      icon: '📤', color: 'blue',    condition: '10 media uploads'              },
  veteran:     { label: 'Veteran',       icon: '🎖️', color: 'rose',   condition: 'Account 1 year old'            },
  streak7:     { label: 'On a Roll',     icon: '🔥', color: 'orange',  condition: '7-day activity streak'         },
  streak30:    { label: 'Unstoppable',   icon: '⚡', color: 'amber',   condition: '30-day activity streak'        },
  verified:    { label: 'Verified',      icon: '✓',  color: 'primary', condition: 'Email verified'                },
  admin:       { label: 'Staff',         icon: '🛡️', color: 'rose',   condition: 'Platform administrator'        },
};

export const RARITY_CONFIG = {
  common:    { labelKey: 'badges.rarity.common',    className: 'text-zinc-400    border-zinc-600/50    bg-zinc-800/50'       },
  uncommon:  { labelKey: 'badges.rarity.uncommon',  className: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/50'   },
  rare:      { labelKey: 'badges.rarity.rare',      className: 'text-blue-400    border-blue-500/40    bg-blue-950/50'      },
  epic:      { labelKey: 'badges.rarity.epic',      className: 'text-purple-400  border-purple-500/40  bg-purple-950/50'   },
  legendary: { labelKey: 'badges.rarity.legendary', className: 'text-amber-400   border-amber-500/40   bg-amber-950/50'    },
};

export const BADGE_COLORS = {
  amber:   { border: 'border-amber-500/40',   glow: 'shadow-amber-500/20',   text: 'text-amber-300'   },
  teal:    { border: 'border-teal-500/40',     glow: 'shadow-teal-500/20',    text: 'text-teal-300'    },
  green:   { border: 'border-emerald-500/40',  glow: 'shadow-emerald-500/20', text: 'text-emerald-300' },
  primary: { border: 'border-primary/40',      glow: 'shadow-primary/20',     text: 'text-primary'     },
  rose:    { border: 'border-rose-500/40',     glow: 'shadow-rose-500/20',    text: 'text-rose-300'    },
  blue:    { border: 'border-blue-500/40',     glow: 'shadow-blue-500/20',    text: 'text-blue-300'    },
  orange:  { border: 'border-orange-500/40',   glow: 'shadow-orange-500/20',  text: 'text-orange-300'  },
  shimmer: { border: 'border-amber-400/30',    glow: 'shadow-amber-400/20',   text: 'text-amber-200'   },
};
