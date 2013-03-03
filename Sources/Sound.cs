using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Media;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace Robots_Massacre_Client
{
    public class Sound
    {
        public static Sound Shoot = new Sound(Properties.Resources.Shoot, 0.125);
        public static Sound MetalHit = new Sound(Properties.Resources.MetalHit, 0.125);
        public static Sound BrickHit = new Sound(Properties.Resources.BrickHit, 0.5);

        private SoundPlayer Player;

        [DllImport("winmm.dll")]
        public static extern int waveOutSetVolume(IntPtr hwo, uint dwVolume);

        public Sound(UnmanagedMemoryStream AudioClip, double Vol)
        {
            Player = new SoundPlayer(AudioClip);
            Player.LoadAsync();
            SetVolume(Vol);
        }

        public void Play()
        {
            Player.Play();
        }

        public void Stop()
        {
            Player.Stop();
        }

        public void SetVolume(double Volume)
        {
            int NewVolume = (int)((ushort.MaxValue / 10) * Volume);
            uint NewVolumeAllChannels = (((uint)NewVolume & 0x0000ffff) | ((uint)NewVolume << 16));
            waveOutSetVolume(IntPtr.Zero, NewVolumeAllChannels);
        }
    }
}