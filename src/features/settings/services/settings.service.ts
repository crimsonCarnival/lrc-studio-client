import { gqlRequest } from '@/app/graphql.client';
import type { Settings, UpdateSettingsInput } from '@/types';

const GET_SETTINGS = /* GraphQL */ `
  query GetSettings {
    settings {
      playback {
        volume
        muted
        autoRewindOnPause { enabled seconds }
        speedBounds { min max }
        showWaveform
        waveformSnap
        loopCurrentLine
        speedPresets
        seekTime
        seekPlays
      }
      editor {
        autoPauseOnMark
        nudge { fine coarse default }
        autoAdvance { enabled skipBlank mode }
        showShiftAll
        shiftAllAmount
        showLineNumbers
        timestampPrecision
        srt { defaultSubtitleDuration minSubtitleGap snapToNextLine }
        history { limit groupingThresholdMs }
        display {
          activeHighlight
          showNextLine
          dualLine
          languageLayout
          translationLayout
          readingFormat
          karaokeFillTrack
          karaokeFillEasing
        }
        scroll { mode alignment }
      }
      export {
        lineEndings
        copyFormat
        downloadFormat
        timestampPrecision
        defaultFilenamePattern
        includeMetadata
        stripEmptyLines
        normalizeTimestamps
        wordTimestampPrecision
      }
      interface {
        defaultLanguage
        fontSize
        spacing
        previewAlignment
        focusMode
        layoutSwap
        playerTop
        editorWidth
        lockLayout
        mobileTab
        toastPosition
      }
      shortcuts {
        mark nudgeLeft nudgeRight nudgeLeftFine nudgeRightFine
        addLine deleteLine clearTimestamp switchMode deselect showHelp
        rangeSelect toggleSelect playPause seekForward seekBackward mute
        speedUp speedDown addSecondary addTranslation toggleTranslation
        focusSync focusPreview focusPlayback
      }
      import { expandRepeats }
      advanced {
        autoSave { enabled timeInterval }
        confirmDestructive
        timezone
      }
    }
  }
`;

const UPDATE_SETTINGS = /* GraphQL */ `
  mutation UpdateSettings($input: UpdateSettingsInput!) {
    updateSettings(input: $input) {
      interface { fontSize spacing }
    }
  }
`;

const RESET_SETTINGS = /* GraphQL */ `
  mutation ResetSettings {
    resetSettings
  }
`;

export const settingsService = {
  async get(): Promise<Settings> {
    const data = await gqlRequest<{ settings: Settings }>(GET_SETTINGS);
    return data.settings;
  },

  async save(input: UpdateSettingsInput): Promise<Settings> {
    const data = await gqlRequest<{ updateSettings: Settings }>(UPDATE_SETTINGS, { input });
    return data.updateSettings;
  },

  // patch maps to save for GQL (partial updates work the same way)
  async patch(input: UpdateSettingsInput): Promise<Settings> {
    return this.save(input);
  },

  async reset(): Promise<boolean> {
    const data = await gqlRequest<{ resetSettings: boolean }>(RESET_SETTINGS);
    return data.resetSettings;
  },
};
