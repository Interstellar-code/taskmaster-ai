import {
  closestCorners,
  getFirstCollision,
  KeyboardCode,
} from "@dnd-kit/core";
import type { DroppableContainer, KeyboardCoordinateGetter } from "@dnd-kit/core";

const directions: string[] = [
  KeyboardCode.Down,
  KeyboardCode.Right,
  KeyboardCode.Up,
  KeyboardCode.Left,
];

export const coordinateGetter: KeyboardCoordinateGetter = (
  event,
  { context: { active, droppableRects, droppableContainers, collisionRect } }
) => {
  if (directions.includes(event.code)) {
    event.preventDefault();

    if (!active || !collisionRect) {
      return;
    }

    const filteredContainers: DroppableContainer[] = [];

    droppableContainers.getEnabled().forEach((entry) => {
      if (!entry || entry?.disabled) {
        return;
      }

      const rect = droppableRects.get(entry.id);

      if (!rect) {
        return;
      }

      const data = entry.data.current;

      if (data) {
        const { type, children } = data;

        if (type === "Column" && children?.length > 0) {
          if (active.data.current?.['type'] !== "Column") {
            return;
          }
        }
      }

      switch (event.code) {
        case KeyboardCode.Down:
          if (collisionRect.top < rect.top) {
            filteredContainers.push(entry);
          }
          break;
        case KeyboardCode.Up:
          if (collisionRect.top > rect.top) {
            filteredContainers.push(entry);
          }
          break;
        case KeyboardCode.Left:
          if (collisionRect.left >= rect.left + rect.width) {
            filteredContainers.push(entry);
          }
          break;
        case KeyboardCode.Right:
          if (collisionRect.left + collisionRect.width <= rect.left) {
            filteredContainers.push(entry);
          }
          break;
      }
    });

    const collisions = closestCorners({
      active,
      collisionRect: collisionRect,
      droppableRects,
      droppableContainers: filteredContainers,
      pointerCoordinates: null,
    });

    const closestId = getFirstCollision(collisions, "id");

    if (closestId != null) {
      const newRect = droppableRects.get(closestId);
      const newDroppable = droppableContainers.get(closestId);

      if (newRect && newDroppable) {
        const newNode = newDroppable.node.current;

        if (newNode) {
          const data = newDroppable.data.current;

          if (data) {
            const { type } = data;

            if (type === "Column") {
              const orientation = newRect.width > newRect.height;

              return {
                x: newRect.left + (orientation ? newRect.width / 4 : newRect.width / 2),
                y: newRect.top + (orientation ? newRect.height / 2 : newRect.height / 4),
              };
            }
          }

          return {
            x: newRect.left + newRect.width / 2,
            y: newRect.top + newRect.height / 2,
          };
        }
      }
    }
  }

  return undefined;
};
