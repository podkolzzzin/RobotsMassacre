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
using MapEditing;
using Gui.PopUps;
using System.IO;

namespace Gui
{
	public class MapEditorGuiScreen : GuiScreen
	{
        private string _name;
        private int _baseTile;
        private int _width;
        private int _height;
        private Modes _mapGameMode;
        private bool _clearScreen;
        public GBitmap Screen;
        private MapEditor _mapEditor;
        private Label lName, lW, lMode;
        private GBitmap _minimizedLevel;
        private bool _minimizedLevelWasRendered;
        private Asker _asker;
        private bool _showAsker;
        public string FileName 
        { 
            get 
            {
                string name = "";
                if (_mapGameMode == Modes.CaptureFlag)
                    name = "ctf";
                else if (_mapGameMode == Modes.Deathmatch)
                    name = "dm";
                else if (_mapGameMode == Modes.TeamDeathmatch)
                    name = "tdm";
                name += "\\" + _name + ".rmm";
                return name;
            }
        }
		public MapEditorGuiScreen(InputHandler Input,GBitmap screen)
			: base(Input, false, false, false, false)
		{
            _asker= new Asker(Input, "Save map before exit?", new string[] { "yes", "no", "cencel" });
            _asker.SetCallback(0, _askerYes);
            _asker.SetCallback(1, _askerNo);
            _asker.SetCallback(2, _askerCencel);
            Screen = screen;
            NonClearableScreen = true;
		}

        private void _askerYes()
        {
            _mapEditor.TryToSave();
            _askerNo();
        }
        private void _askerNo()
        {
            _showAsker = false;
            GameComponent.SetCurrentScreen(0);
        }
        private void _askerCencel()
        {
            _showAsker = false;
        }

        public override void Render(GBitmap screen)
        {
            Screen = screen;
            if (_showAsker)
            {
                screen.Fill(255, 0, 0, 0);
                _asker.Render(screen);
            }
            if (_clearScreen || (_minimizedLevel!=null && !_minimizedLevelWasRendered))
            {
                screen.Fill(255, 0, 0, 0);
                _mapEditor.Render(screen);
                base.Render(screen);
            }


            if (_minimizedLevel != null && !_minimizedLevelWasRendered)
            {
                _minimizedLevelWasRendered = true;
                screen.FillRect(Color.FromArgb(200, 0, 0, 0), 0, 0, screen.Width, screen.Height);
                int cx = (GameComponent.GetScreenWidth() - _minimizedLevel.Width) / 2;
                int cy = (GameComponent.GetScreenHeight() - _minimizedLevel.Height) / 2;
                screen.Blit(_minimizedLevel, cx, cy);
            }
            _clearScreen = false;
        }

        public override void Update()
        {
            if (_showAsker)
            {
                _asker.Update();
            }
            if (Input.Esc.Down)
            {
                _showAsker = true;
            }
            if (Input.Q.Down && _minimizedLevel==null)
            {
                _minimizedLevel = _mapEditor.GetFitImage(GameComponent.GetScreenWidth(),GameComponent.GetScreenHeight());
            }
            else
            {
                _mapEditor.Update();
                if (_minimizedLevel != null)
                {
                    _minimizedLevelWasRendered = false;
                    _clearScreen = true;
                }
            }

            if (!Input.Q.Down)
            {
                _minimizedLevel = null;
            }
        }

        private void _constructLabels()
        {
            lName = new Label(Input);
            lName.Text = "Map: " + _name;
            Controls.Add(lName);

            lW = new Label(Input);
            lW.Text = _width + "x" + _height;
            Controls.Add(lW);

            lMode = new Label(Input);
            lMode.Text = "Mode: " + _mapGameMode.ToString();
            Controls.Add(lMode);       
        }

        public void Construct(string name, int baseTile,Modes mapGameMode, int width, int height)
        {
            Screen.Fill(255, 0, 0, 0);

            _mapEditor = new MapEditor(Input, width, height, baseTile, mapGameMode, this);
            _mapEditor.Screen = Screen;
            _mapEditor.OffsetX = 0;
            _mapEditor.OffsetY = 28;
            _mapEditor.BottomOffset = 65;

            _name = name;
            _baseTile = baseTile;
            _width = width;
            _height = height;
            _mapGameMode = mapGameMode;

            _constructLabels();
            Resized();
            _clearScreen = true;
        }

        public void Construct(string fileName)
        {
            Screen.Fill(255, 0, 0, 0);

            FileInfo f = new FileInfo(fileName);
            Modes mode=Modes.Deathmatch;
            if (f.Directory.Name == "dm")
                mode = Modes.Deathmatch;
            else if (f.Directory.Name == "tdm")
                mode = Modes.TeamDeathmatch;
            else if (f.Directory.Name == "ctf")
                mode = Modes.CaptureFlag;
            var t = LevelGen.ParseLevel(fileName);
            _width = (int)t[0];
            _height = (int)t[1];
            _mapGameMode = mode;
            _name = f.Name.Substring(0, f.Name.IndexOf(f.Extension));

            _constructLabels();

            _mapEditor = new MapEditor(Input, _width, _height, _mapGameMode, this, (List<GEntity>)t[2], (List<GEntity>)t[3], (List<GEntity>)t[4]);
            _mapEditor.Screen = Screen;
            _mapEditor.OffsetX = 0;
            _mapEditor.OffsetY = 28;
            _mapEditor.BottomOffset = 65;

            Resized();
            _clearScreen = true;
        }

        public override void Resized()
        {
            lName.X = 10;
            lName.Y = 10;
            lW.X = GameComponent.GetScreenWidth() / 2;
            lW.Y = 10;
            lMode.X = GameComponent.GetScreenWidth() - GFont.GetStringWidth(lMode.Text, 1) - 10;
            lMode.Y = 10;
            base.Resized();
            _clearScreen = true;
            Render(Screen);
        }

        public System.Drawing.Graphics Graphics { get; set; }

    }
}
