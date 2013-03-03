using Entity;
using Entity.Tile;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MapEditing
{
    class ClipbardElement
    {
        public int Type;
        public bool IsTile;
        public int lx, ly;

        public GEntity Create(int selectedX, int selectedY)
        {
            int x = (selectedX + lx) * GTile.WIDTH;
            int y = (selectedY + ly) * GTile.HEIGHT;
            switch (Type)
            {
                case TileType.GRASS:
                    return new Grass(x, y);
                case TileType.GRAVEL:
                    return new Gravel(x, y);
                case TileType.SAND:
                    return new Sand(x, y);
                case TileType.WATER:
                    return new Water(x, y);
                case TileType.WALL:
                    return new Wall(x, y);
                case TileType.METAL:
                    return new Metal(x, y);
            }
            return new GTile(x, y, true);
        }
    }
    class MapClipboard
    {
        public List<ClipbardElement> Tiles;
        public List<ClipbardElement> Entities;
        public bool IsEmpty { get { return Tiles.Count==0 && Entities.Count==0;} }
        public int Width, Height;
        private MapEditor _parent;
        public MapClipboard(MapEditor parent)
        {
            _parent = parent;
            Tiles = new List<ClipbardElement>();
            Entities = new List<ClipbardElement>();
        }

        public void Clear()
        {
            Width = Height = 0;
            Tiles = new List<ClipbardElement>();
            Entities = new List<ClipbardElement>();
        }

        public void Add(ClipbardElement item)
        {
            if (item.IsTile)
                Tiles.Add(item);
            else
                Entities.Add(item);
        }
        public ClipbardElement GetTile(int x, int y)
        {
            return Tiles[x * Height + y];
        }
        public ClipbardElement GetEntity(int x, int y)
        {
            return Entities[x * Height + y];
        }

        public void Paste(int selectedX, int selectedY)
        {
            for (int i = 0; i < Width; i++)
            {
                for (int j = 0; j < Height; j++)
                {
                    if (_parent._isBorder(selectedX + i, selectedY + j))
                        continue;
                    _parent._setTopTile(selectedX + i, selectedY + j, GetTile(i, j).Create(selectedX, selectedY));
                    if (GetEntity(i, j).Type == -1)
                        _parent._setTopEntity(selectedX + i, selectedY + j, null);
                    else
                        _parent._setTopEntity(selectedX + i, selectedY + j, GetEntity(i,j).Create(selectedX,selectedY));
                }
            }
            _parent.Render(_parent.Screen);
        }

        public void Copy(int selectedX,int selectedY)
        {
            ClipbardElement t;
            for (int i = selectedX; i < selectedX + Width; i++)
            {
                for (int j = selectedY; j < selectedY + Height; j++)
                {
                    t = new ClipbardElement();
                    t.lx = i - selectedX;
                    t.ly = j - selectedY;
                    t.Type = _parent._getTile(i, j).Type;
                    if (t.Type==0)
                        t.Type = TileType.GRAVEL;
                    t.IsTile = true;
                    Add(t);

                    t = new ClipbardElement();
                    t.lx = i - selectedX;
                    t.ly = j - selectedY;
                    if (_parent._getEntity(i, j) != null)
                    {
                        t.Type = _parent._getEntity(i, j).Type;
                    }
                    else
                    {
                        t.Type = -1;
                        t.IsTile = false;
                    }
                    Add(t);
                }
            }
        }
    }
}
