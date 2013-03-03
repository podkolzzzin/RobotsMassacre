using Entity;
using Entity.Tile;
using Gfx;
using Gui;
using Gui.Components;
using Level;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;

namespace MapEditing
{
	class MapEditor
	{
		public const int BORDER_WIDTH = 7;
		public List<GEntity> Tiles, Entities, Spawners;
		public Dictionary<int, Flag> Flags = new Dictionary<int, Flag>();
		public int OffsetX;
		public int OffsetY;
		public int LevelWidth, LevelHeight;
		public InputHandler Input;
		public GBitmap Screen;
		public int DisplayOffsetX;
		public int DisplayOffsetY;
		public int BottomOffset;
		public int DisplayHeight { get { return GameComponent.GetScreenHeight() - OffsetY - BottomOffset; } }
		public int DisplayWidth { get { return GameComponent.GetScreenWidth(); } }
        public int DisplayedElementsX { get { return DisplayWidth / GTile.WIDTH; } }
        public int DisplayedElementsY { get { return DisplayHeight / GTile.HEIGHT; } }

		internal Modes _mode;
		internal int _tileOffsetX, _tileOffsetY;
		internal GBitmap _background;
		internal SelectableGrid _toolBox;
		internal MapEditorGuiScreen _parent;
        internal History _history;
        internal Selector _selector;

		private Brush _brush;
        private bool _showMap;
        private MiniMap _miniMap;

		public MapEditor(InputHandler Input, int levelWidth, int levelHeight, int fillTile, Modes mapMode, MapEditorGuiScreen parent)
		{
			_parent = parent;
			_mode = mapMode;

			LevelWidth = levelWidth;
			LevelHeight = levelHeight;
			this.Input = Input;

			Tiles = new List<GEntity>();
			Entities = new List<GEntity>();
			Spawners = new List<GEntity>();

			GEntity e, t;
			int tx, ty;
			for (int i = 0; i < LevelHeight; i++)
			{
				ty = i * GTile.HEIGHT;
				for (int j = 0; j < levelWidth; j++)
				{
					e = t = null;
					tx = j * GTile.WIDTH;
					if (_isBorder(j, i))
					{
						Entities.Add(new Metal(tx, ty));
						Tiles.Add(new GTile(tx, ty, true));
						continue;
					}
					switch (fillTile)
					{
						case TileType.WALL:
							e = new Wall(tx, ty);
							t = new Gravel(tx, ty);
							break;
						case TileType.METAL:
							e = new Metal(tx, ty);
							break;
						case TileType.SAND:
							t = new Sand(tx, ty);
							break;
						case TileType.WATER:
							t = new Water(tx, ty);
							break;
						case TileType.GRAVEL:
							t = new Gravel(tx, ty);
							break;
						case TileType.GRASS:
							t = new Grass(tx, ty);
							break;
					}

					if (t == null)
						t = new GTile(tx, ty, true);
					Tiles.Add(t);
					Entities.Add(e);
				}
			}
            _endConstruct();
		}

        public MapEditor(InputHandler Input, int levelWidth, int levelHeight, Modes mapMode, MapEditorGuiScreen parent, 
            List<GEntity> tiles, List<GEntity> entities, List<GEntity> spawners)
        {
            _parent = parent;
            _mode = mapMode;

            LevelWidth = levelWidth;
            LevelHeight = levelHeight;
            this.Input = Input;

            Entities = new List<GEntity>();
            Tiles = new List<GEntity>();
            for (int i = 0; i < tiles.Count; i++)
            {
                Entities.Add(null);
                Tiles.Add(null);
            }
            int x, y;
            foreach (GEntity g in entities)
            {
                x = g.iX / GTile.WIDTH;
                y = g.iY / GTile.HEIGHT;
                Entities[y * LevelWidth + x] = g;
            }

            foreach (GEntity g in tiles)
            {
                x = g.iX / GTile.WIDTH;
                y = g.iY / GTile.HEIGHT;
                Tiles[y * LevelWidth + x] = g;            
            }

            foreach (GEntity g in spawners)
            {
                x = g.iX / GTile.WIDTH;
                y = g.iY / GTile.HEIGHT;
                Entities[y * LevelWidth + x] = g;
            }
            _endConstruct();
        }

        public void _endConstruct()
        {
            _brush = new Brush(this);
            _selector = new Selector(this);
            _history = new History(this);
            _miniMap = new MiniMap(this);

            _createBackground();
            _initToolbox();
        }

        internal void _initToolbox()
		{
			_toolBox = new SelectableGrid(Input, 0, GameComponent.GetScreenHeight() - 55, 500);
			_toolBox.Selected = -1;
			_toolBox.SetItemDimension(30, 30);
			GridItem item = new GridItem("1", Art.GRAPHICS[0, 2]);
			_toolBox.Push(item);

			item = new GridItem("2", Art.GRAPHICS[0, 4]);
			_toolBox.Push(item);

			item = new GridItem("3", Art.GRAPHICS[0, 6]);
			_toolBox.Push(item);

			item = new GridItem("4", Art.GRAPHICS[0, 5]);
			_toolBox.Push(item);

			item = new GridItem("5", Art.GRAPHICS[0, 3]);
			_toolBox.Push(item);

			item = new GridItem("6", Art.GRAPHICS[1, 4]);
			_toolBox.Push(item);

			item = new GridItem("7", Art.GRAPHICS[3, 18]);
			_toolBox.Push(item);

			item = new GridItem("8", Art.GRAPHICS[2, 18]);
			_toolBox.Push(item);

			item = new GridItem("9", Art.GRAPHICS[5, 18]);
			_toolBox.Push(item);

			item = new GridItem("0", Art.GRAPHICS[4, 18]);
			_toolBox.Push(item);
		}

		internal bool _isBorder(int x, int y)
		{
			return ((x == BORDER_WIDTH - 1) ||
					(y == BORDER_WIDTH - 1) ||
					(x == LevelWidth - BORDER_WIDTH) ||
					(y == LevelHeight - BORDER_WIDTH)) && !_isOutsideBorder(x, y);
		}

		internal bool _isOutsideBorder(int x, int y)
		{
			Rectangle r = new Rectangle(BORDER_WIDTH - 1, BORDER_WIDTH - 1, LevelWidth - BORDER_WIDTH * 2 + 2, LevelHeight - BORDER_WIDTH * 2 + 2);
			return !r.Contains(x, y);
		}

		internal GEntity _getTopElement(int x, int y)
		{
			if (x < 0 || y < 0)
				return null;
			int id = y * LevelWidth + x;
			if (id < 0)
				return null;
			if (id >= Entities.Count)
				return null;
			if (id > Entities.Count)
				return null;
			if (Entities[id] != null)
				return Entities[id];
			else
				return Tiles[id];
		}

		internal GEntity _getEntity(int x, int y)
		{
			int id = y * LevelWidth + x;
			return Entities[id];
		}

		internal GEntity _getTile(int x, int y)
		{
			return Tiles[y * LevelWidth + x];
		}

		internal void _setTopEntity(int x, int y, GEntity entity)
		{
			if (entity == null)
			{
				Entities[y * LevelWidth + x] = null;
				_getTile(x, y).Render(_background);
                _miniMap.Set(_getTile(x, y));
				return;
			}
			if (entity.GetType() == typeof(Flag) || entity.GetType() == typeof(Spawner))
			{
				GEntity t = Tiles[y * LevelWidth + x];
				t.Render(_background);
				t.X += OffsetX - _tileOffsetX * GTile.WIDTH;
				t.Y += OffsetY - _tileOffsetY * GTile.HEIGHT;
				t.Render(Screen);
				t.X -= OffsetX - _tileOffsetX * GTile.WIDTH;
				t.Y -= OffsetY - _tileOffsetY * GTile.HEIGHT;
			}
			Entities[y * LevelWidth + x] = entity;
			entity.Render(_background);

            _miniMap.Set(entity);
		}

		internal void _setTopTile(int x, int y, GEntity tile)
		{
			Entities[y * LevelWidth + x] = null;
			Tiles[y * LevelWidth + x] = tile;
			tile.Render(_background);
            _drawEntityOnScreen(tile);

            _miniMap.Set(tile);
		}

		internal void _setTile(int x, int y, GEntity tile)
		{
			Tiles[y * LevelWidth + x] = tile;
            if (Entities[y * LevelWidth + x] == null)
            {
                tile.Render(_background);
                _miniMap.Set(tile);
            }
		}

		internal void _createBackground()
		{
			_background = new GBitmap(LevelWidth * GTile.WIDTH, LevelHeight * GTile.HEIGHT);
			foreach (GEntity item in Tiles)
			{
				item.Render(_background);
			}
			foreach (GEntity item in Entities)
			{
				if (item != null)
					item.Render(_background);
			}
		}

		public void Render(GBitmap screen)
		{
			_toolBox.Y = GameComponent.GetScreenHeight() - 55;
			_toolBox.X = (GameComponent.GetScreenWidth() - 350) / 2;
			Screen = screen;
			Screen.FillRect(Color.FromArgb(255, 0, 0, 0), OffsetX, OffsetY, DisplayWidth, DisplayHeight);
			if (_background.Width < DisplayWidth)
				OffsetX = (DisplayWidth - _background.Width) / 2;

			_background.ScreenHeight = DisplayHeight;
			_background.ScreenWidth = DisplayWidth;

            Screen.FillRect(Color.Black, 0, GameComponent.GetScreenHeight() - BottomOffset, GameComponent.GetScreenWidth(), BottomOffset);
			_toolBox.Render(Screen);
			screen.Blit(_background.GetClippedImage(), OffsetX, OffsetY);
			_brush.Render();
		}

		public bool InCameraFocus(GEntity Entity)
		{
			return Entity.X > DisplayOffsetX - 30 && Entity.Y > DisplayOffsetY - 30 &&
				Entity.X < DisplayOffsetX + DisplayWidth + 30 && Entity.Y < DisplayOffsetY + DisplayHeight + 30;
		}

		internal void _drawEntityOnScreen(GEntity t)
		{
			int sx = t.iX, sy = t.iY;
			t.X = 0;
			t.Y = 0;
			GBitmap g = new GBitmap(GTile.WIDTH, GTile.HEIGHT);
			t.Render(g);
			t.X = sx;
			t.Y = sy;
			g.ScreenWidth = (int)(DisplayWidth - sx + _tileOffsetX * GTile.HEIGHT);
			g.ScreenHeight = (int)(DisplayHeight - sy + _tileOffsetY * GTile.WIDTH);

			if (g.ScreenWidth > GTile.WIDTH) g.ScreenWidth = GTile.WIDTH;
			if (g.ScreenHeight > GTile.HEIGHT) g.ScreenHeight = GTile.HEIGHT;
			int x = sx + OffsetX - _tileOffsetX * GTile.WIDTH;
			int y = sy + OffsetY - _tileOffsetY * GTile.HEIGHT;
			if (g.ScreenHeight < 0 || g.ScreenWidth < 0 || x < OffsetX || y < OffsetY)
			{
				return;
			}
			Screen.Blit(g.GetClippedImage(), x, y);
		}

		internal void _updateToolbox()
		{
			if (Input._0.Clicked)
				_brush.Index = 9;
			else if (Input._1.Clicked)
				_brush.Index = 0;
			else if (Input._2.Clicked)
				_brush.Index = 1;
			else if (Input._3.Clicked)
				_brush.Index = 2;
			else if (Input._4.Clicked)
				_brush.Index = 3;
			else if (Input._5.Clicked)
				_brush.Index = 4;
			else if (Input._6.Clicked)
				_brush.Index = 5;
			else if (Input._7.Clicked && _mode==Modes.CaptureFlag)
				_brush.Index = 6;
            else if (Input._8.Clicked && _mode == Modes.CaptureFlag)
				_brush.Index = 7;
			else if (Input._9.Clicked)
				_brush.Index = 8;
		}

		internal void _setFlag(Flag r)
		{
			try
			{
				int x = (int)Flags[(int)r.Team].X / GTile.WIDTH;
				int y = (int)Flags[(int)r.Team].Y / GTile.HEIGHT;
				_setTopEntity(x, y, null);
				_drawEntityOnScreen(_getTile(x, y));
				Flags[(int)r.Team] = r;
			}
			catch (KeyNotFoundException)
			{
				Flags.Add((int)r.Team, r);
			}
			int nx = (int)r.X / GTile.WIDTH;
			int ny = (int)r.Y / GTile.HEIGHT;
			_setTopEntity(nx, ny, r);

            _miniMap.Set(r);
		}

        private int _showText;
        public void TryToSave()
        {
            if (!MapSaver.Save(_parent.FileName, this))
            {
                Screen.FillRect(Color.FromArgb(200, 0, 0, 0), OffsetX, OffsetY, DisplayWidth, DisplayHeight);
                GFont.WriteXCenter(Screen, "Impossible to save map. It has no spawners", 1, GameComponent.GetScreenHeight() / 2);
                _showText = 15;
            }       
        }

		public void Update()
		{
            _showText--;
            if (_showText > 0)
                return;
            if (_showText == 0)
                Render(Screen);
			_background.SetScreenSize(DisplayWidth, DisplayHeight);
			_brush.Update();
			_selector.Update();
			_updateToolbox();
            
			if (Input.Ctrl.Down && Input.Z.Clicked)
			{
				_history.Undo();
			}
			else if (Input.Ctrl.Down && Input.Y.Clicked)
			{
				_history.Redo();
			}
            else if (Input.Ctrl.Down && Input.S.Clicked)
            {
                TryToSave();
            }

            if (Input.M.Clicked)
            {
                _showMap = !_showMap;
                Render(Screen);
                return;
            }

            if (_showMap)
            {
                _miniMap.Render(Screen);
            }

			if (_selector.NeedToRender)
				_selector.Render(Screen);

		}

		internal void _setSpawner(Spawner r)
		{
			_setTopEntity(r.iX / GTile.WIDTH, r.iY / GTile.HEIGHT, r);
		}

        public Bitmap GetMinimized(float zoom)
        {
            var bitmap = _background.GetFullImage();
            Bitmap temp = new Bitmap((int)(bitmap.Width / zoom), (int)(bitmap.Height / zoom));
            Graphics g = Graphics.FromImage(temp);
            g.DrawImage(bitmap, new Rectangle(0, 0, (int)(bitmap.Width / zoom), (int)(bitmap.Height / zoom)),
                new Rectangle(0, 0, bitmap.Width, bitmap.Height),
                GraphicsUnit.Pixel);
            g.Dispose();
            return temp;
        }

        public GBitmap GetFitImage(int dW,int dH)
        {
            var bitmap = _background.GetFullImage();
            float zX, zY;
            zX = (float)bitmap.Width / dW;
            zY = (float)bitmap.Height / dH;
            if (dW > bitmap.Width)
                zX = 1;
            if (dH > bitmap.Height)
                zY = 1;
            return new GBitmap(GetMinimized(Math.Max(zX,zY)));
        }
    }
}
