using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using Robots_Massacre_Client;
using Entity;
using Entity.Tile;
using Level;

namespace MapEditing
{
    class Brush
    {
        public InputHandler Input;
        public int Index { get { return _brushIndex; } set { _brushIndex = value; Render(); } }
        
        private int _brushIndex = 1;
        private MapEditor _parent;
        private int _symmetryX, _symmetryY;

        public Brush(MapEditor parent)
        {
            _symmetryX = -1;
            _symmetryY = -1;
            _parent = parent;
            Input = parent.Input;
        }
        public void Update()
        {
            _renderSymmetry();
            _updateBrush();
        }

        public void Render()
        {
            _renderSymmetry();
            _parent.Screen.FillRect(Color.Black, _parent._toolBox.X - 5, _parent._toolBox.Y, 360, 50);
            _parent.Screen.FillRect(Color.Gray, _parent._toolBox.X + _brushIndex * 35 - 3, _parent._toolBox.Y, 35, 50);
            _parent._toolBox.Render(_parent.Screen);
            if (_parent._mode != Modes.CaptureFlag)
            {
                _parent.Screen.FillRect(Color.FromArgb(200, 0, 0, 0), _parent._toolBox.X + 35 * 6, _parent._toolBox.Y, 35 * 2 - 3, 35);
            }
        }

        private void _renderSymmetry()
        {
            if (_symmetryX != -1 && _symmetryX > _parent._tileOffsetX && _symmetryX < _parent._tileOffsetX + _parent.DisplayedElementsX)
            {
                int x = (_symmetryX - _parent._tileOffsetX) * GTile.WIDTH + _parent.OffsetX;
                _parent.Screen.DrawLine(Color.Snow, 4, x,
                    _parent.OffsetY, x, _parent.OffsetY + _parent.DisplayHeight);
            }

            if (_symmetryY != -1 && _symmetryY > _parent._tileOffsetY && _symmetryY < _parent._tileOffsetY + _parent.DisplayedElementsY)
            {
                int y = (_symmetryY - _parent._tileOffsetY) * GTile.HEIGHT + _parent.OffsetY;
                _parent.Screen.DrawLine(Color.Snow, 4, _parent.OffsetX,
                    y, _parent.DisplayWidth+ _parent.OffsetX, y);
            }
        }

        internal void _updateBrush()
        {
            if (Input.F1.Down)
            {
                _symmetryX = _parent._selector.X;
                _parent.Render(_parent.Screen);
            }
            else if (Input.F2.Down)
            {
                _symmetryY = _parent._selector.Y;
                _parent.Render(_parent.Screen);
            }
            else if (Input.F3.Clicked)
            {
                _symmetryX = -1;
                _symmetryY = -1;
                _parent.Render(_parent.Screen);
            }
            else if (Input.Attack.Down)
            {
                if (_parent._isBorder(_parent._selector.X, _parent._selector.Y)) return;
                _fillSelected();
            }
        }
        internal void _setEntity(int lx, int ly)
        {
            if (!(lx >= 0 && ly >= 0 && lx < _parent.LevelWidth && ly < _parent.LevelHeight) || _parent._isBorder(lx,ly))
                return;
            int x = lx * GTile.WIDTH;
            int y = ly * GTile.HEIGHT;
            GEntity r;
            switch (_brushIndex)
            {
                case 0:
                    r = new Wall(x, y);
                    _parent._setTopEntity(lx, ly, r);
                    break;
                case 1:
                    r = new Metal(x, y);
                    _parent._setTopEntity(lx, ly, r);
                    break;
                case 2:
                    r = new Sand(x, y);
                    _parent._setTopTile(lx, ly, r);
                    break;
                case 3:
                    r = new Water(x, y);
                    _parent._setTopTile(lx, ly, r);
                    break;
                case 4:
                    r = new Gravel(x, y);
                    _parent._setTopTile(lx, ly, r);
                    break;
                case 5:
                    r = new Grass(x, y);
                    _parent._setTopTile(lx, ly, r);
                    break;
                case 6:
                    if (_parent._isOutsideBorder(lx, ly)) break;
                    r = new Flag(x, y, Teams.Red);
                    _parent._setFlag((Flag)r);
                    break;
                case 7:
                    if (_parent._isOutsideBorder(lx, ly)) break;
					r = new Flag(x, y, Teams.Blu);
                    _parent._setFlag((Flag)r);
                    break;
                case 8:
                    if (_parent._isOutsideBorder(lx, ly)) break;
                    r = new Spawner(x, y, Teams.Red);
                    _parent._setSpawner((Spawner)r);
                    break;
                case 9:
                    if (_parent._isOutsideBorder(lx, ly)) break;
                    r = new Spawner(x, y, Teams.Blu);
                    _parent._setSpawner((Spawner)r);
                    break;
            }
        }

        private void _fillSelected()
        {
            _parent._history.Add(_parent._selector.X, _parent._selector.Y, _parent._selector.Width, _parent._selector.Height);
            for (int i = _parent._selector.X; i < _parent._selector.X + _parent._selector.Width; i++)
            {
                for (int j = _parent._selector.Y; j < _parent._selector.Y + _parent._selector.Height; j++)
                {
                    if (!_parent._isBorder(i, j))
                    {
                        _setEntity(i, j);
                    }
                }
            }

            if (_symmetryX != -1 || _symmetryY != -1)
                Symmetry(_parent._selector.X, _parent._selector.Y, _parent._selector.Width, _parent._selector.Height);
            else
                _parent.Render(_parent.Screen);
        }

        public void Symmetry(int x, int y, int w, int h)
        {
            if (_symmetryX == -1 && _symmetryY == -1)
                return;

            int sx, sy;
            int sw, sh;
            if (_symmetryX != -1)
            {
                sx = 2 * _symmetryX - 1 - x;
                sy = y;
                sw = w;
                sh = h;
                _saveToHistory(sx, sy, sw, sh);
                if (_symmetryY != -1)
                {
                    sy = 2 * _symmetryY - sy - 1;
                    _saveToHistory(sx, sy, sw, sh);
                }
            }

            if (_symmetryY != -1)
            {
                sx = x;
                sy = 2 * _symmetryY - y - 1;
                sw = w;
                sh = h;
                _saveToHistory(sx, sy, sw, sh);
            }

            for (int i = 0; i < w; i++)
            {
                for (int j = 0; j < h; j++)
                { 
                     if (_symmetryX != -1)
                     {
                         sx = 2 * _symmetryX - i - 1 - x;
                         sy = j + y;
                        _setEntity(sx,sy);
                        if (_symmetryY != -1)
                        {
                            sy = 2 * _symmetryY - sy - 1;
                            _setEntity(sx, sy);
                        }
                     }
                     if (_symmetryY != -1)
                     {
                         sx = i + x;
                         sy = 2 * _symmetryY - j - 1 - y;
                         _setEntity(sx, sy);
                     }
                }
            }
           
            _parent.Render(_parent.Screen);        
        }

        private void _saveToHistory(int sx, int sy, int sw, int sh)
        {
            if (sx < 0)
            {
                sw += sx;
                sx = 0;
            }
            if (sy < 0)
            {
                sh += sy;
                sy = 0;
            }

            if (sx + sw >= _parent.LevelWidth)
            {
                sw = _parent.LevelWidth - sx - 1;
            }

            if (sy + sh >= _parent.LevelHeight)
            {
                sh = _parent.LevelHeight - sy - 1;
            }

            if (sw == 0 || sh == 0)
                return;

            _parent._history.Add(sx, sy, sw, sh);
        }
    }
}
