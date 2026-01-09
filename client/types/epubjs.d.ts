declare module 'epubjs' {
  export interface Book {
    ready: Promise<void>;
    loaded: {
      navigation: Promise<Navigation>;
    };
    locations: Locations;
    renderTo(element: HTMLElement, options?: RenderOptions): Rendition;
  }

  export interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    themes: Themes;
    on(event: string, callback: (location: any) => void): void;
    destroy(): void;
  }

  export interface Themes {
    default(styles: Record<string, string>): void;
    fontSize(size: string): void;
  }

  export interface Locations {
    length(): number;
    generate(chars: number): Promise<string[]>;
    locationFromCfi(cfi: string): number;
    percentageFromCfi(cfi: string): number;
  }

  export interface Navigation {
    toc: TableOfContentsItem[];
  }

  export interface TableOfContentsItem {
    label: string;
    href: string;
    subitems?: TableOfContentsItem[];
  }

  export interface RenderOptions {
    width?: string | number;
    height?: string | number;
    spread?: 'none' | 'always';
  }

  export default function ePub(url: string, options?: any): Book;
}
