using Entity.Tile;
using Gfx;
using Gui.Components;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui
{
	class CreateMapGuiScreen : GuiScreen
	{
		private Label _cursor;
		private TextBox _mapTitle;
		private ComboBox _base, _mapMode;
		private NumericUpDown _width, _height;
		private const int _WIDTH = 120 + 35 * 5;
		private const int _HEIGHT = 140;

		public CreateMapGuiScreen(InputHandler Input)
			: base(Input, false, true, false, false)
		{
			Label tlabel = new Label(Input);
			tlabel.Text = "title: ";
			tlabel.Size = 2;
			Controls.Add(tlabel);

			tlabel = new Label(Input);
			tlabel.Text = "base: ";
			tlabel.Size = 2;
			Controls.Add(tlabel);

            tlabel = new Label(Input);
            tlabel.Text = "mode: ";
            tlabel.Size = 2;
            Controls.Add(tlabel);

			tlabel = new Label(Input);
			tlabel.Text = "width: ";
			tlabel.Size = 2;
			Controls.Add(tlabel);

			tlabel = new Label(Input);
			tlabel.Text = "height: ";
			tlabel.Size = 2;
			Controls.Add(tlabel);

			_mapTitle = new TextBox(Input);
			_mapTitle.MaxLength = 18;
			_mapTitle.Size = 2;
			Controls.Add(_mapTitle);

			_base = new ComboBox(Input);
            _base.Items.Add(Art.GRAPHICS[0, 2]);
            _base.Items.Add(Art.GRAPHICS[0, 4]);
            _base.Items.Add(Art.GRAPHICS[0, 6]);			
			_base.Items.Add(Art.GRAPHICS[0, 5]);
            _base.Items.Add(Art.GRAPHICS[0, 3]);
			_base.Items.Add(Art.GRAPHICS[1, 4]);
            Controls.Add(_base);

            _mapMode = new ComboBox(Input);
            _mapMode.Items.Add(Art.GRAPHICS[23, 19]);
            _mapMode.Items.Add(Art.GRAPHICS[24, 19]);
            _mapMode.Items.Add(Art.GRAPHICS[25, 19]);
            Controls.Add(_mapMode);


			_width = new NumericUpDown(Input);
			_width.Value = 20;
			_width.MinValue = 20;
			_width.MaxValue = 120;
			Controls.Add(_width);

			_height = new NumericUpDown(Input);
			_height.Value = 20;
			_height.MinValue = 20;
			_height.MaxValue = 120;
			Controls.Add(_height);

			_mapTitle.IsFocused = true;

			_cursor = new Label(Input);
			_cursor.Text = ">";
			_cursor.Size = 2;
			Controls.Add(_cursor);

			Update();
		}

		private int _labelX = 20, _controlX = 150;
		public override void Update()
		{
			int lY = _getStartY();
			int cY = lY;
			foreach (GuiComponent item in Controls)
			{
				if (item.GetType() == typeof(Label))
				{
					_labelX = _getLabelX();
					item.X = _labelX;
					item.Y = lY;
					lY += 40;
				}
				else
				{
					_controlX = _getControlX();
					item.X = _controlX;
					item.Y = cY;
					cY += 40;
				}
			}


			if (Input.Tab.Clicked)
			{
				if (_mapTitle.IsFocused)
				{
					_base.IsFocused = true;
					_mapTitle.IsFocused = false;
				}
				else if (_base.IsFocused)
				{
					_mapMode.IsFocused = true;
					_base.IsFocused = false;
				}
                else if (_mapMode.IsFocused)
                {
                    _width.IsFocused = true;
                    _mapMode.IsFocused = false;
                }
                else if (_width.IsFocused)
                {
                    _height.IsFocused = true;
                    _width.IsFocused = false;
                }
                else if (_height.IsFocused)
                {
                    _mapTitle.IsFocused = true;
                    _height.IsFocused = false;
                }
			}

			foreach (GuiComponent item in Controls)
			{
				if (item.IsFocused)
				{
					_cursor.Y = item.Y;
					_cursor.X = _getLabelX() - 20;
				}
			}

			_base.Y -= 15;
            _mapMode.Y -= 15;
            if (Input.Attack.Clicked)
            {
                if (IsDataValid())
                {
                    var screen = (MapEditorGuiScreen)GameComponent.GetScreen(9);
                    screen.Construct(_mapTitle.Text, _base.SelectedItem + 1, (Level.Modes)(_mapMode.SelectedItem + 1), _width.Value, _height.Value);
                    GameComponent.SetCurrentScreen(9);
                }
            }

			base.Update();
		}

        private bool IsDataValid()
        {
            return (_mapTitle.Text.Length > 0);
        }

		private int _getStartY()
		{
			return (GameComponent.GetScreenHeight() - _HEIGHT) / 2;
		}

		private int _getLabelX()
		{
			return (GameComponent.GetScreenWidth() - _WIDTH) / 2;
		}

		private int _getControlX()
		{
			return _getLabelX() + GFont.GetStringWidth("height: ", 2) + 20;
		}
	}
}