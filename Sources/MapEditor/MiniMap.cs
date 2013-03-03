using Entity;
using Entity.Tile;
using Gfx;
using Level;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;

namespace MapEditing
{
    class MiniMap
    {
        private MapEditor _parent;
        public GBitmap Image;
        private int _zoom;

        public MiniMap(MapEditor parent)
        {
            _parent = parent;
            _create();
        }

        private void _create()
        {
            int ms = Math.Max(_parent.LevelHeight,(int)(_parent.LevelWidth/1.8));
            if (ms < 25)
                _zoom = 3;
            else if (ms < 45)
                _zoom = 2;
            else
                _zoom = 1;


            Image = new GBitmap(_parent.LevelWidth*_zoom, _parent.LevelHeight*_zoom);
            for (int i = 0; i < _parent.LevelWidth; i++)
            {
                for (int j = 0; j < _parent.LevelHeight; j++)
                {
                    Set(_parent._getTopElement(i, j));
                }
            }


        }


        public void Set(GEntity e)
        {
            int sx=e.iX / GTile.WIDTH * _zoom;
            int sy=e.iY / GTile.HEIGHT * _zoom;
            for (int i = 0; i < _zoom;i++)
            {
                for (int j = 0; j < _zoom; j++)
                {
                    Image.SetPixel(sx + i, sy + j, LevelGen.GetEntityColor(e));
                }
            }
        }

        public void Render(GBitmap Screen)
        {
            Screen.Blit(Image, 0, GameComponent.GetScreenHeight() -  Image.Height);
        }
    }
}
