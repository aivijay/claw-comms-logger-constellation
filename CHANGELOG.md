# Changelog

All notable changes to this project will be documented in this file.

## [1.0.5] - 2026-03-18

### Added
- Version indicator (v1.0.5) on both constellation and fleet pages
- Status color dot in tooltip on constellation page (NodeTooltip.tsx)
- Status color dot in tooltip on fleet page (OrganismCanvas.tsx)

### Fixed
- Color consistency across pages - Active (green), Idle (orange), Error (red), Offline (gray)
- Updated STATUS_COLORS in OrganismCanvas to match NodeTooltip colors

## [1.0.4] - 2026-03-18

### Added
- Version indicator (v1.0.4) - deployed but had color consistency issues

## [1.0.3] - 2026-03-18

### Added
- Initial version tracking implementation (incomplete)

## [1.0.0] - 2026-03-18

### Added
- Initial commit: constellation visualization dashboard
- Constellation canvas view (/constellation)
- Fleet/organism canvas view (/fleet)
- Agent node tooltips
- Node drawer for agent details
- Real-time agent communication graph