using Gfx;
using Gui.Components;
using MapEditing;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;

namespace Gui
{
    class MapWarehouseGuiScreen:GuiScreen
    {
        public ComboBox _modeBox;
        public TextBox _searchBox;
        public SelectableGrid _mapBox;
        private bool _isLoading;
        private bool _isLoaded;
        public MapWarehouseGuiScreen(InputHandler Input)
            : base(Input,true,true,true,false)
        {
            _modeBox = new ComboBox(Input);
            _modeBox.IsFocused = true;
            _modeBox.X = 160;
            _modeBox.Y = 10;
            _modeBox.Items.Add(Art.GRAPHICS[23, 19]);
            _modeBox.Items.Add(Art.GRAPHICS[24, 19]);
            _modeBox.Items.Add(Art.GRAPHICS[25, 19]);
            Controls.Add(_modeBox);

            Label temp = new Label(Input);
            temp.Text = "Search map";
            temp.X = 300;
            temp.Y = 25;
            Controls.Add(temp);

            _searchBox = new TextBox(Input);
            _searchBox = new TextBox(Input);
            _searchBox.X = 390;
            _searchBox.Y = 25;
            _searchBox.MaxLength = 16;
            Controls.Add(_searchBox);

            _mapBox = new SelectableGrid(Input, 10, 65, 150);
            _mapBox.IsFocused = false;
            _mapBox.SetBorder(3);
            _mapBox.SetItemDimension(150, 150);

        }

        private void _init(object state)
        {
            try
            {
                var maps = MapWarehouse.Get(Level.Modes.Deathmatch);
                _stuffMapBox(maps);
                Controls.Add(_mapBox);
                _isLoaded = true;
            }
            catch
            {
                _isLoaded = false;
            }
            finally
            {
                _isLoading = false;
            }
        }

        private void _stuffMapBox(List<KeyValuePair<string, BinaryReader>> items)
        {
            _mapBox.Grid.Clear();
            foreach (var item in items)
            {
                _mapBox.Push(new GridItem(item.Key, Level.LevelGen.CreateThumbnail(item.Value)));
            }        
        }

        public override void Update()
        {
            if (!_isLoading && !_isLoaded)
            {
                _isLoading = true;
                ThreadPool.QueueUserWorkItem(_init);
            }

            if (Input.Tab.Clicked)
            {
                if (_modeBox.IsFocused)
                {
                    _searchBox.IsFocused = true;
                    _modeBox.IsFocused = false;
                }
                else if (_searchBox.IsFocused)
                {
                    _mapBox.IsFocused = true;
                    _searchBox.IsFocused = false;
                }
                else if (_mapBox.IsFocused)
                {
                    _modeBox.IsFocused = true;
                    _mapBox.IsFocused = false;
                }
            }

            if (Input.Attack.Clicked)
            {
                if (_modeBox.IsFocused)
                {
                    _stuffMapBox(MapWarehouse.Get((Level.Modes)(_modeBox.SelectedItem + 1)));
                }
                else if (_mapBox.IsFocused)
                {
                    MapWarehouse.Save(_mapBox.Selected, (Level.Modes)(_modeBox.SelectedItem+1));
                }
            }
            
            base.Update();
        }
    }
}
