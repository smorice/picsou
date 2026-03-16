'use client';

import { Fragment, memo } from 'react';

type BreadcrumbItem = {
  key: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
};

type AppBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

function AppBreadcrumbsComponent({ items }: AppBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <nav aria-label="Fil d Ariane" className="breadcrumbNav persistentBreadcrumbNav">
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? <span aria-hidden="true" className="breadcrumbSep">/</span> : null}
          {item.active || !item.onClick ? (
            <span aria-current={item.active ? 'page' : undefined} className="breadcrumbCurrent persistentBreadcrumbCurrent">{item.label}</span>
          ) : (
            <button className="breadcrumbBack persistentBreadcrumbLink" onClick={item.onClick} type="button">{item.label}</button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export const AppBreadcrumbs = memo(AppBreadcrumbsComponent);