using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Entity;
using Robots_Massacre_Client;
using Entity.Tile;
using System.Drawing;
using Gfx;

namespace MapEditing
{
    class Selector
    {
        private int _selectedX, _selectedY, _selectedW = 1, _selectedH = 1;
        public int X
        {
            get
            {
                if (_selectedW > 0)
                    return _selectedX;
                else
                    return _selectedX + _selectedW;
            }
        }
        public int Y
        {
            get
            {
                if (_selectedH > 0)
                    return _selectedY;
                else
                    return _selectedY + _selectedH;
            }
        }
        public int Width
        {
            get
            {
                return Math.Abs(_selectedW);
            }
        }
        public int Height
        {
            get
            {
                return Math.Abs(_selectedH);
            }
        }
        private MapEditor _parent;
        private MapClipboard _clipboard;
        public InputHandler Input;
        internal Color _rectColor;
        public bool NeedToRender;
        public Selector(MapEditor parent)
        {        
            _parent = parent;
            Input = parent.Input;
            _clipboard = new MapClipboard(_parent);
        }

        private void _clear(GBitmap Screen)
        {
            for (int i = X - 1; i < X + Width + 1; i++)
            {
                for (int j = Y - 1; j < Y + Height + 1; j++)
                {
                    var t = _parent._getTopElement(i, j);
                    if (t != null)
                    {
                        if (typeof(Flag) == t.GetType() || typeof(Spawner)==t.GetType())
                            _parent._drawEntityOnScreen(_parent._getTile(i, j));
                        _parent._drawEntityOnScreen(t);
                    }
                }
            }
        }

        public void Render(GBitmap Screen)
        {
            _clear(Screen);
            int rx = (X - _parent._tileOffsetX) * GTile.WIDTH + _parent.OffsetX + 1;
            int ry = (Y - _parent._tileOffsetY) * GTile.HEIGHT + _parent.OffsetY + 1;

            Screen.DrawRect(_rectColor, 2, rx, ry, (GTile.WIDTH * Width) - 2, (GTile.HEIGHT * Height) - 2);
        }

        public void Update()
        {
            NeedToRender = false;
            int dx = 0, dy = 0;
            if (Input.Up.Clicked && _selectedY - 1 >= 0)
                dy--;
            else if (Input.Down.Clicked && _selectedY + 1 < _parent.LevelHeight)
                dy++;
            else if (Input.Left.Clicked && _selectedX - 1 >= 0)
                dx--;
            else if (Input.Right.Clicked && _selectedX + 1 < _parent.LevelWidth)
                dx++;

            if (Input.Shift.Clicked)
            {           
                if(_selectedW+dx<=_parent.LevelWidth)
                    _selectedW += dx;
                if(_selectedH+dy<=_parent.LevelHeight)
                    _selectedH += dy;

                if (_selectedW == 0)
                    _selectedW = -1;
                if (_selectedH == 0)
                    _selectedH = -1;

                if (_selectedX + _selectedW - _parent._tileOffsetX > _parent.DisplayedElementsX)
                    _selectedW--;
                if (_selectedY + _selectedH - _parent._tileOffsetY > _parent.DisplayedElementsY)
                    _selectedH--;

                if (_selectedX + _selectedW < _parent._tileOffsetX)
                    _selectedW++;
                if (_selectedY + _selectedH < _parent._tileOffsetY)
                    _selectedH++;

                if (_selectedW == -1)
                {
                    _selectedX++;
                    _selectedW = -2;
                }
                if (_selectedH == -1)
                {
                    _selectedY++;
                    _selectedH = -2;
                }
                NeedToRender = true;
            }
            else if(dx!=0 || dy!=0)
            {
                _clear(_parent.Screen);
                _selectedW = 1;
                _selectedH = 1;
                _selectedX += dx;
                _selectedY += dy;
                NeedToRender = true;
            }

            if (Input.Ctrl.Down && Input.C.Down && Width>1 && Height>1)
            {
                _clipboard.Clear();
                _clipboard.Width = Width;
                _clipboard.Height = Height;
                _clipboard.Copy(X, Y);
            }
            else if (Input.Ctrl.Down && Input.V.Down)
            {
                if (!_clipboard.IsEmpty)
                {
                    _parent._history.Add(X, Y, _clipboard.Width, _clipboard.Height);
                    _clipboard.Paste(X, Y);
                    NeedToRender = true;
                }
            }
            else if (Input.Ctrl.Down && Input.X.Clicked)
            {
                _clipboard.Clear();
                _clipboard.Width = Width;
                _clipboard.Height = Height;
                _clipboard.Copy(X, Y);
                Delete();
                NeedToRender = true;
            }

            if (X < _parent._tileOffsetX)
            {
                _parent._tileOffsetX--;
                _parent._background.SetOffset(_parent._tileOffsetX * GTile.WIDTH, _parent._tileOffsetY * GTile.HEIGHT);
                _parent.Render(_parent.Screen);
                return;
            }
            else if (X > _parent._tileOffsetX + _parent.DisplayWidth / GTile.WIDTH)
            {
                _parent._tileOffsetX++;
                _parent._background.SetOffset(_parent._tileOffsetX * GTile.WIDTH, _parent._tileOffsetY * GTile.HEIGHT);
                _parent.Render(_parent.Screen);
                return;
            }

            if (Y < _parent._tileOffsetY)
            {
                _parent._tileOffsetY--;
                _parent._background.SetOffset(_parent._tileOffsetX * GTile.WIDTH, _parent._tileOffsetY * GTile.HEIGHT);
                _parent.Render(_parent.Screen);
                return;
            }
            else if (Y >= _parent._tileOffsetY + _parent.DisplayHeight / GTile.HEIGHT)
            {
                _parent._tileOffsetY++;
                _parent._background.SetOffset(_parent._tileOffsetX * GTile.WIDTH, _parent._tileOffsetY * GTile.HEIGHT);
                _parent.Render(_parent.Screen);
                return;
            }

            if (Input.Delete.Clicked)
            {
                Delete();
                NeedToRender = true;
            }

            if (_parent._isOutsideBorder(X, Y))
                _rectColor = Color.Silver;
            else if (_parent._isBorder(X, Y))
                _rectColor = Color.Red;
            else
                _rectColor = Color.White;
        }

        public void Delete()
        {
            _parent._history.Add(X, Y, Width, Height);
            for (int i = X; i < X + Width; i++)
            {
                for (int j = Y; j < Y + Height; j++)
                {
                    if(!_parent._isBorder(i,j))
                        _parent._setTopEntity(i, j, null);
                }
            }
        }
    }

}
