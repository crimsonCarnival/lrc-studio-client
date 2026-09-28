import type { ComponentType } from 'react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from './context-menu';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu';

/**
 * The subset of menu parts that ContextMenu and DropdownMenu both expose with
 * structurally identical shapes.
 *
 * A menu writes its item list ONCE against this type and renders it through
 * whichever set its trigger needs, so a right-click menu and a ⋮ menu cannot
 * drift apart. That drift is not hypothetical: EditorLineContextMenu and
 * LineActionsPopover were written as independent components and the right-click
 * one silently grew six capabilities the button never got.
 *
 * This is deliberately NOT a registry or a descriptor framework. Each menu still
 * writes ordinary JSX and owns its own permission checks; only the component
 * identities are swapped.
 *
 * The `ComponentType<any>` below is the one intentional `any` in this design and
 * is confined to this file. The two Radix families are structurally identical but
 * nominally distinct types; typing them precisely would mean threading generics
 * through every menu for no caller-visible benefit, since callers pass only
 * `onClick`, `variant`, `disabled` and children. It never reaches a call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MenuPart = ComponentType<any>;

export type MenuComponents = {
  Item: MenuPart;
  Separator: MenuPart;
  Label: MenuPart;
  Sub: MenuPart;
  SubTrigger: MenuPart;
  SubContent: MenuPart;
};

export const contextMenuComponents: MenuComponents = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Label: ContextMenuLabel,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

export const dropdownMenuComponents: MenuComponents = {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
  Label: DropdownMenuLabel,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};
